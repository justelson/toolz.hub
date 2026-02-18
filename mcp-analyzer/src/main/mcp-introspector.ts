import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import type { MCPServer, MCPServerInfo } from '../shared/types';

export async function introspectMCPServer(server: MCPServer): Promise<MCPServerInfo> {
  return new Promise((resolve) => {
    const logPrefix = `[mcp-introspect:${server.name || server.id}]`;

    if (server.disabled) {
      console.warn(`${logPrefix} Skipping: server disabled in config`);
      resolve({ error: 'Server is disabled in config. Enable it to introspect.' });
      return;
    }

    if (!server.command) {
      console.warn(`${logPrefix} Skipping: server command is empty`);
      resolve({ error: 'Server command is empty.' });
      return;
    }

    const commandBase = path.basename(server.command).toLowerCase();
    const longStartupCommands = new Set(['npx', 'uvx', 'pipx', 'npm', 'pnpm', 'yarn', 'bunx']);
    const timeoutMs = longStartupCommands.has(commandBase) ? 30000 : 10000;

    const timeout = setTimeout(() => {
      console.warn(`${logPrefix} Timeout after ${Math.round(timeoutMs / 1000)}s`);
      resolve({ error: `Introspection timeout (${Math.round(timeoutMs / 1000)}s)` });
    }, timeoutMs);

    let resolved = false;
    let initialized = false;
    let stderr = '';
    let child: ReturnType<typeof spawn> | null = null;
    let stdoutBuffer = Buffer.alloc(0);
    let pendingInfo: MCPServerInfo | null = null;

    const finish = (info: MCPServerInfo) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      if (info.error) {
        console.warn(`${logPrefix} Failed: ${info.error}`);
      } else {
        console.log(`${logPrefix} Success: tools=${info.tools?.length ?? 0}`);
      }
      try {
        child?.kill();
      } catch {
        // ignore
      }
      resolve(info);
    };

    type SendMode = 'framed' | 'line';
    let sendMode: SendMode = 'framed';

    const sendMessage = (stream: NodeJS.WritableStream, message: Record<string, unknown>, mode: SendMode) => {
      const payload = JSON.stringify(message);
      if (mode === 'line') {
        stream.write(payload + '\n');
      } else {
        const header = `Content-Length: ${Buffer.byteLength(payload, 'utf8')}\r\n\r\n`;
        stream.write(header + payload);
      }
    };

    const parseJsonRpcMessages = () => {
      // Prefer MCP stdio framing (Content-Length). Fallback to line-delimited JSON.
      let progressed = true;
      while (progressed) {
        progressed = false;
        const headerEnd = stdoutBuffer.indexOf('\r\n\r\n');
        if (headerEnd !== -1) {
          const headerText = stdoutBuffer.slice(0, headerEnd).toString('utf8');
          const match = headerText.match(/Content-Length:\s*(\d+)/i);
          if (!match) {
            // If we saw headers but no length, drop them to avoid deadlock
            stdoutBuffer = stdoutBuffer.slice(headerEnd + 4);
            progressed = true;
            continue;
          }
          const length = parseInt(match[1], 10);
          const messageStart = headerEnd + 4;
          if (stdoutBuffer.length < messageStart + length) {
            break;
          }
          const payload = stdoutBuffer.slice(messageStart, messageStart + length).toString('utf8');
          stdoutBuffer = stdoutBuffer.slice(messageStart + length);
          progressed = true;
          handleMessage(payload);
          continue;
        }

        // Fallback: newline-delimited JSON (non-standard but used by some servers)
        const newlineIndex = stdoutBuffer.indexOf('\n');
        if (newlineIndex !== -1) {
          const line = stdoutBuffer.slice(0, newlineIndex).toString('utf8').trim();
          stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
          progressed = true;
          if (line.startsWith('{')) {
            handleMessage(line);
          }
        }
      }
    };

    const handleMessage = (raw: string) => {
      try {
        const response = JSON.parse(raw);

        if (response.error) {
          finish({ error: response.error.message || 'MCP server error' });
          return;
        }

        if (response.result && response.result.capabilities && !initialized) {
          initialized = true;
          const info: MCPServerInfo = {
            serverInfo: response.result.serverInfo,
            tools: [],
            resources: [],
            prompts: [],
          };

          // Send initialized notification and request tools list
          if (!child || !child.stdin) {
            finish({ error: 'MCP process not available' });
            return;
          }
          console.log(`${logPrefix} Initialized. Requesting tools/list`);
          sendMessage(child.stdin, {
            jsonrpc: '2.0',
            method: 'notifications/initialized',
          }, sendMode);
          sendMessage(child.stdin, {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
          }, sendMode);

          // Wait for tools response
          pendingInfo = info;
          return;
        }

        if (response.result && response.result.tools && pendingInfo) {
          pendingInfo.tools = response.result.tools;
          console.log(`${logPrefix} Received tools: ${response.result.tools.length}`);
          finish(pendingInfo);
        }
      } catch {
        // ignore malformed JSON
      }
    };

    const detectSendMode = (scriptPath: string | null): SendMode => {
      if (!scriptPath) return 'framed';
      try {
        const content = fs.readFileSync(scriptPath, 'utf8');
        const hasMcpSdk = content.includes('mcp.server') || content.includes('stdio_server');
        const hasContentLength = content.toLowerCase().includes('content-length');
        const lineLoop = content.includes('for line in sys.stdin') || (content.includes('sys.stdin') && content.includes('json.loads'));
        if (hasMcpSdk || hasContentLength) return 'framed';
        if (lineLoop) return 'line';
      } catch {
        // ignore
      }
      return 'framed';
    };

    let runId = 0;

    const startProcess = (mode: SendMode, args: string[]) => {
      const currentRunId = ++runId;
      sendMode = mode;
      const env = { ...process.env, ...server.env };

      child = spawn(server.command, args, {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      stdoutBuffer = Buffer.alloc(0);
      stderr = '';
      initialized = false;
      pendingInfo = null;

      console.log(`${logPrefix} Spawned pid=${child.pid ?? 'unknown'} mode=${mode}`);

      if (child.stdout) {
        child.stdout.on('data', (data) => {
          if (currentRunId !== runId) return;
          stdoutBuffer = Buffer.concat([stdoutBuffer, data]);
          parseJsonRpcMessages();
        });
      } else {
        finish({ error: 'MCP process stdout is not available' });
        return;
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          if (currentRunId !== runId) return;
          const chunk = data.toString();
          stderr += chunk;
          if (mode === 'framed' && !initialized && /invalid json|jsondecodeerror/i.test(chunk)) {
            console.warn(`${logPrefix} Detected line-based server, retrying with newline JSON`);
            // Restart with line-delimited JSON
            if (child) {
              try {
                child.kill();
              } catch {
                // ignore
              }
            }
            startProcess('line', args);
          }
        });
      }

      child.on('error', (error) => {
        if (currentRunId !== runId) return;
        finish({ error: `Failed to spawn: ${error.message}` });
      });

      child.on('close', (code) => {
        if (currentRunId !== runId) return;
        if (!resolved) {
          finish({ error: `Process exited with code ${code}. stderr: ${stderr.substring(0, 200)}` });
        }
      });

      console.log(`${logPrefix} Sending initialize (mode=${mode})`);
      if (!child.stdin) {
        finish({ error: 'MCP process stdin is not available' });
        return;
      }
      sendMessage(child.stdin, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'mcp-analyzer',
            version: '1.0.0',
          },
        },
      }, mode);
    };

    try {
      const args = [...server.args];
      console.log(`${logPrefix} Starting. command="${server.command}" args=${JSON.stringify(args)} source=${server.source || 'Unknown'}`);
      // Preflight: if first arg looks like a script path, verify it exists
      if (args.length > 0 && typeof args[0] === 'string' && args[0].match(/\.(py|js|mjs|cjs|ts)$/i)) {
        const scriptArg = args[0];
        const candidates: string[] = [];
        if (path.isAbsolute(scriptArg)) {
          candidates.push(scriptArg);
        } else {
          if (server.configPath) {
            candidates.push(path.resolve(path.dirname(server.configPath), scriptArg));
          }
          candidates.push(path.resolve(process.cwd(), scriptArg));
        }
        const existingPath = candidates.find((p) => fs.existsSync(p));
        if (!existingPath) {
          console.warn(`${logPrefix} Script not found: ${candidates.join(' or ')}`);
          finish({ error: `Script not found: ${candidates.join(' or ')}` });
          return;
        }
        args[0] = existingPath;
        sendMode = detectSendMode(existingPath);
      }

      startProcess(sendMode, args);
    } catch (error) {
      finish({ error: `Introspection failed: ${(error as Error).message}` });
    }
  });
}
