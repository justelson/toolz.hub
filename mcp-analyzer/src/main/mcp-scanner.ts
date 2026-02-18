import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { MCPServer } from '../shared/types';

const execAsync = promisify(exec);

// MCP config locations for different apps
const MCP_CONFIG_LOCATIONS = {
  // Kiro
  kiro_user: path.join(os.homedir(), '.kiro', 'settings', 'mcp.json'),
  kiro_workspace: path.join(process.cwd(), '.kiro', 'settings', 'mcp.json'),
  
  // Claude Desktop
  claude_desktop_mac: path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
  claude_desktop_windows: path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json'),
  
  // Cline (VS Code extension)
  cline_vscode_windows: path.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json'),
  cline_vscode_mac: path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json'),
  cline_vscode_linux: path.join(os.homedir(), '.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json'),
  
  // VS Code MCP extension
  vscode_mcp_windows: path.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'modelcontextprotocol.mcp', 'mcp.json'),
  vscode_mcp_mac: path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'modelcontextprotocol.mcp', 'mcp.json'),
  vscode_mcp_linux: path.join(os.homedir(), '.config', 'Code', 'User', 'globalStorage', 'modelcontextprotocol.mcp', 'mcp.json'),
  
  // Roo Cline
  roo_cline_windows: path.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'cline_mcp_settings.json'),
  roo_cline_mac: path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'cline_mcp_settings.json'),
  roo_cline_linux: path.join(os.homedir(), '.config', 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'cline_mcp_settings.json'),
  
  // Roo Code (standalone)
  roo_code_windows: path.join(process.env.USERPROFILE || '', '.roo', 'mcp_settings.json'),
  roo_code_mac: path.join(os.homedir(), '.roo', 'mcp_settings.json'),
  roo_code_linux: path.join(os.homedir(), '.roo', 'mcp_settings.json'),
  
  // Zed Editor - uses settings.json with context_servers key
  zed_windows: path.join(process.env.APPDATA || '', 'Zed', 'settings.json'),
  zed_mac: path.join(os.homedir(), 'Library', 'Application Support', 'Zed', 'settings.json'),
  zed_linux: path.join(os.homedir(), '.config', 'zed', 'settings.json'),
  
  // Cursor (VS Code fork) - verified paths from online research
  cursor_windows: path.join(process.env.USERPROFILE || '', '.cursor', 'mcp.json'),
  cursor_mac: path.join(os.homedir(), '.cursor', 'mcp.json'),
  cursor_linux: path.join(os.homedir(), '.cursor', 'mcp.json'),
  
  // Windsurf (Codeium) - verified paths from online research
  windsurf_windows: path.join(process.env.USERPROFILE || '', '.codeium', 'windsurf', 'mcp_config.json'),
  windsurf_mac: path.join(os.homedir(), '.codeium', 'windsurf', 'mcp_config.json'),
  windsurf_linux: path.join(os.homedir(), '.codeium', 'windsurf', 'mcp_config.json'),
  
  // Continue.dev (VS Code extension) - verified paths from online research
  continue_windows: path.join(process.env.USERPROFILE || '', '.continue', 'config.json'),
  continue_mac: path.join(os.homedir(), '.continue', 'config.json'),
  continue_linux: path.join(os.homedir(), '.continue', 'config.json'),
  
  // Antigravity IDE - stored in .gemini/antigravity folder
  antigravity_windows: path.join(process.env.USERPROFILE || '', '.gemini', 'antigravity', 'mcp_config.json'),
  antigravity_mac: path.join(os.homedir(), '.gemini', 'antigravity', 'mcp_config.json'),
  antigravity_linux: path.join(os.homedir(), '.gemini', 'antigravity', 'mcp_config.json'),
  
  // Gemini CLI - uses settings.json with mcpServers key
  gemini_cli_windows: path.join(process.env.USERPROFILE || '', '.gemini', 'settings.json'),
  gemini_cli_mac: path.join(os.homedir(), '.gemini', 'settings.json'),
  gemini_cli_linux: path.join(os.homedir(), '.gemini', 'settings.json'),
  
  // Codex CLI - uses config.toml
  codex_cli_windows: path.join(process.env.USERPROFILE || '', '.codex', 'config.toml'),
  codex_cli_mac: path.join(os.homedir(), '.codex', 'config.toml'),
  codex_cli_linux: path.join(os.homedir(), '.codex', 'config.toml'),
};

export async function scanMCPServers(): Promise<MCPServer[]> {
  const servers: MCPServer[] = [];
  const seenIds = new Set<string>();
  const detectedIDEs = new Set<string>(); // Track which IDEs have config files

  console.log('=== MCP Scanner Starting ===');
  console.log(`Total config locations to check: ${Object.keys(MCP_CONFIG_LOCATIONS).length}`);

  // Get running processes once upfront (with longer timeout and error handling)
  const runningProcessNames = await getRunningProcessNames();

  // Scan all config locations in parallel
  const configPromises = Object.entries(MCP_CONFIG_LOCATIONS).map(async ([source, configPath]) => {
    try {
      console.log(`[${source}] Checking config at: ${configPath}`);
      const configData = await fs.readFile(configPath, 'utf-8');
      console.log(`[${source}] ✓ Config file found, size: ${configData.length} bytes`);
      
      // Mark this IDE as detected (config file exists)
      const ideName = getSourceName(source);
      detectedIDEs.add(ideName);
      
      // Handle different config formats
      let mcpServers: Record<string, Record<string, unknown>> = {};
      
      // Codex CLI uses TOML format
      if (source.includes('codex_cli')) {
        // Parse TOML - basic parsing for mcp_servers section (note: underscore, not camelCase!)
        // Format: [mcp_servers.servername]
        const tomlLines = configData.split('\n');
        let currentServer = '';
        let currentConfig: Record<string, unknown> = {};
        
        for (const line of tomlLines) {
          // Match both [mcp_servers.name] and [[mcp_servers.name]]
          const serverMatch = line.match(/\[+mcp_servers\.([^\]]+)\]+/);
          if (serverMatch) {
            if (currentServer && Object.keys(currentConfig).length > 0) {
              mcpServers[currentServer] = currentConfig;
            }
            currentServer = serverMatch[1];
            currentConfig = {};
          } else if (currentServer) {
            const keyMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
            if (keyMatch) {
              const [, key, value] = keyMatch;
              try {
                // Try to parse as JSON (for arrays like args = ["arg1", "arg2"])
                currentConfig[key] = JSON.parse(value);
              } catch {
                // If not JSON, treat as string and remove quotes
                currentConfig[key] = value.replace(/^["']|["']$/g, '');
              }
            }
          }
        }
        if (currentServer && Object.keys(currentConfig).length > 0) {
          mcpServers[currentServer] = currentConfig;
        }
      } else {
        // JSON-based configs
        const config = JSON.parse(configData);
        
        // Zed uses "context_servers" key in settings.json
        if (source.includes('zed')) {
          mcpServers = config.context_servers || {};
        }
        // Gemini CLI uses "mcpServers" in settings.json
        else if (source.includes('gemini_cli')) {
          mcpServers = config.mcpServers || {};
        }
        // Continue.dev uses "mcpServers" in config.json
        else if (source.includes('continue')) {
          mcpServers = config.mcpServers || {};
        }
        // Windsurf uses "mcpServers" in mcp_config.json
        else if (source.includes('windsurf')) {
          mcpServers = config.mcpServers || {};
        }
        // Antigravity uses "mcpServers" in mcp_config.json
        else if (source.includes('antigravity')) {
          mcpServers = config.mcpServers || {};
        }
        // Roo Code uses "mcpServers" in mcp_settings.json
        else if (source.includes('roo_code')) {
          mcpServers = config.mcpServers || {};
        }
        // Standard format (Kiro, Claude Desktop, Cline, Roo Cline, etc.)
        else {
          mcpServers = config.mcpServers || config.servers || {};
        }
      }
      
      const foundServers: MCPServer[] = [];
      for (const [name, serverConfig] of Object.entries(mcpServers)) {
        // Extract server properties with proper typing
        const command = typeof serverConfig.command === 'string' ? serverConfig.command : '';
        const args = Array.isArray(serverConfig.args) ? serverConfig.args : [];
        const env = typeof serverConfig.env === 'object' && serverConfig.env !== null ? serverConfig.env as Record<string, string> : {};
        const disabled = typeof serverConfig.disabled === 'boolean' ? serverConfig.disabled : false;
        const autoApprove = Array.isArray(serverConfig.autoApprove) ? serverConfig.autoApprove : [];
        
        // Create a unique ID based on name + command + configPath to avoid duplicates
        const serverId = `${name}-${command}-${configPath}`.replace(/[^a-zA-Z0-9-_]/g, '_');
        
        // Skip duplicates
        if (seenIds.has(serverId)) {
          console.log(`[${source}] Skipping duplicate: ${name}`);
          continue;
        }
        seenIds.add(serverId);
        
        // Quick status check using cached process list
        const status = checkServerStatusFast(command, runningProcessNames);
        
        foundServers.push({
          id: serverId,
          name,
          command,
          args,
          env,
          status,
          configPath,
          disabled,
          autoApprove,
          source: getSourceName(source),
        });
      }
      
      if (foundServers.length > 0) {
        console.log(`[${source}] Found ${foundServers.length} MCP server(s)`);
      }
      
      return foundServers;
    } catch (error) {
      // Config not found or invalid - log for debugging
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'ENOENT') {
        console.log(`[${source}] Error reading config: ${err.message}`);
      }
      return [];
    }
  });

  // Wait for all config scans to complete
  const configResults = await Promise.all(configPromises);
  configResults.forEach(result => servers.push(...result));

  console.log(`=== Config Scan Complete: Found ${servers.length} servers from configs ===`);
  console.log(`Detected IDEs with config files: ${Array.from(detectedIDEs).join(', ')}`);

  // Auto-discover sibling MCP servers in toolz/ (server.py)
  const toolzServers = await scanToolzSiblingServers(servers, seenIds);
  if (toolzServers.length > 0) {
    console.log(`Discovered ${toolzServers.length} local toolz server(s)`);
    servers.push(...toolzServers);
  }

  // Add placeholder entries for detected IDEs with no servers
  for (const ideName of detectedIDEs) {
    const hasServers = servers.some(s => s.source === ideName);
    if (!hasServers) {
      console.log(`Adding placeholder for ${ideName} (no servers found)`);
      servers.push({
        id: `placeholder-${ideName}`,
        name: `No servers configured`,
        command: '',
        args: [],
        env: {},
        status: 'unknown',
        configPath: '',
        disabled: false,
        autoApprove: [],
        source: ideName,
      });
    }
  }

  // Scan running processes for MCP servers (using cached list)
  const runningMCPs = findMCPInProcesses(runningProcessNames);
  console.log(`Found ${runningMCPs.length} MCP servers from running processes`);
  
  // Merge with config-based servers
  for (const running of runningMCPs) {
    const existing = servers.find(s => s.name === running.name);
    if (!existing) {
      servers.push(running);
    } else {
      existing.status = 'running';
    }
  }

  return servers;
}

// Get all running process names once with better error handling
async function getRunningProcessNames(): Promise<Set<string>> {
  const processNames = new Set<string>();
  
  try {
    const platform = os.platform();

    if (platform === 'win32') {
      // Use wmic to get both process name AND command line
      const cmd = 'wmic process get name,commandline /format:csv';
      
      const { stdout } = await execAsync(cmd, { 
        timeout: 15000,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true
      });
      
      const lines = stdout.split('\n');

      for (const line of lines) {
        if (!line.trim() || line.startsWith('Node,')) continue; // Skip header
        
        const parts = line.split(',');
        if (parts.length < 3) continue;
        
        const commandLine = parts.slice(1, -1).join(',').toLowerCase(); // Everything except first and last
        const processName = parts[parts.length - 1]?.trim().toLowerCase();
        
        if (processName) {
          processNames.add(processName);
          if (processName.endsWith('.exe')) {
            processNames.add(processName.replace('.exe', ''));
          }
        }
        
        // For Node.js processes, extract the script name from command line
        if (processName === 'node.exe' || processName === 'node') {
          // Look for patterns like: node server.js, node index.js, npx something, etc.
          const scriptMatch = commandLine.match(/node(?:\.exe)?\s+(?:.*[\\/])?([^\s\\/"]+\.(?:js|mjs|ts))/i);
          if (scriptMatch) {
            const scriptName = scriptMatch[1].toLowerCase();
            processNames.add(scriptName);
            processNames.add(scriptName.replace(/\.(js|mjs|ts)$/, ''));
          }
          
          // Check for npx/npm commands
          if (commandLine.includes('npx') || commandLine.includes('npm')) {
            const npxMatch = commandLine.match(/npx\s+([^\s]+)/i);
            if (npxMatch) {
              processNames.add(npxMatch[1].toLowerCase());
            }
          }
          
          // Check for common MCP patterns in command line
          if (commandLine.includes('mcp-server') || commandLine.includes('mcp_')) {
            const mcpMatch = commandLine.match(/([^\s\\/"]+mcp[^\s\\/"]*)/i);
            if (mcpMatch) {
              processNames.add(mcpMatch[1].toLowerCase());
            }
          }
        }
        
        // For Python processes (uvx, python)
        if (processName === 'python.exe' || processName === 'python' || processName === 'uvx.exe' || processName === 'uvx') {
          // Extract the module/script name
          const pythonMatch = commandLine.match(/(?:python|uvx)(?:\.exe)?\s+(?:.*[\\/])?([^\s\\/"]+)/i);
          if (pythonMatch) {
            const moduleName = pythonMatch[1].toLowerCase();
            processNames.add(moduleName);
          }
        }
      }
      
      console.log(`Found ${processNames.size} running processes (including command line analysis)`);
    } else {
      // Unix/Linux/Mac
      const cmd = 'ps -eo comm=,args=';
      const { stdout } = await execAsync(cmd, { 
        timeout: 15000,
        maxBuffer: 10 * 1024 * 1024
      });
      
      const lines = stdout.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const processName = parts[0]?.toLowerCase();
        if (processName) {
          processNames.add(processName);
        }
        
        // Check for node processes
        if (processName === 'node') {
          const scriptMatch = line.match(/node\s+(?:.*\/)?([^\s/]+\.(?:js|mjs|ts))/i);
          if (scriptMatch) {
            processNames.add(scriptMatch[1].toLowerCase());
          }
        }
      }
      
      console.log(`Found ${processNames.size} running processes`);
    }
  } catch (error) {
    const err = error as Error;
    console.error('Error getting process list:', err.message);
    // Fallback to simple tasklist
    try {
      const { stdout } = await execAsync('tasklist /NH', { 
        timeout: 15000,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true
      });
      
      const lines = stdout.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const name = parts[0]?.toLowerCase();
        if (name) {
          processNames.add(name);
          if (name.endsWith('.exe')) {
            processNames.add(name.replace('.exe', ''));
          }
        }
      }
      console.log(`Found ${processNames.size} running processes (fallback)`);
    } catch (fallbackError) {
      const fbErr = fallbackError as Error;
      console.error('Fallback also failed:', fbErr.message);
    }
  }

  return processNames;
}

// Fast status check using cached process list
function checkServerStatusFast(command: string, runningProcesses: Set<string>): 'running' | 'stopped' | 'unknown' {
  if (!command) return 'unknown';
  
  // If process list is empty (error occurred), return unknown
  if (runningProcesses.size === 0) return 'unknown';
  
  // Extract just the executable name from the command
  const commandLower = command.toLowerCase();
  const commandName = path.basename(command).toLowerCase();
  const commandWithoutExt = commandName.replace('.exe', '');
  
  // For Node.js commands (node, npx, npm), extract the script/package name
  let scriptName = '';
  if (commandLower.includes('node') || commandLower.includes('npx') || commandLower.includes('npm')) {
    // Try to extract script name: "node server.js" -> "server"
    const scriptMatch = commandLower.match(/node(?:\.exe)?\s+(?:.*[\\/])?([^\s\\/"]+\.(?:js|mjs|ts))/i);
    if (scriptMatch) {
      scriptName = scriptMatch[1].replace(/\.(js|mjs|ts)$/, '');
    }
    
    // Try to extract npx package: "npx @modelcontextprotocol/server-filesystem" -> "server-filesystem"
    const npxMatch = commandLower.match(/npx\s+(?:@[^/]+\/)?([^\s]+)/i);
    if (npxMatch) {
      scriptName = npxMatch[1];
    }
  }
  
  // For Python/uvx commands
  if (commandLower.includes('python') || commandLower.includes('uvx')) {
    const pythonMatch = commandLower.match(/(?:python|uvx)(?:\.exe)?\s+(?:.*[\\/])?([^\s\\/"]+)/i);
    if (pythonMatch) {
      scriptName = pythonMatch[1].replace(/\.py$/, '');
    }
  }
  
  // Check various forms of the command name
  const variations = [
    commandName,
    commandWithoutExt,
    scriptName,
    // Split command by spaces and check each part
    ...commandLower.split(/[\s]+/).map(part => path.basename(part).replace('.exe', '')).filter(part => part.length > 2)
  ].filter(Boolean);
  
  for (const variant of variations) {
    if (runningProcesses.has(variant)) {
      console.log(`✓ Found running process: ${variant} for command: ${command}`);
      return 'running';
    }
  }
  
  console.log(`✗ Process not found for command: ${command} (checked: ${variations.join(', ')})`);
  return 'stopped';
}

// Find MCP servers in process list
function findMCPInProcesses(runningProcesses: Set<string>): MCPServer[] {
  const servers: MCPServer[] = [];
  const mcpPatterns = ['uvx', 'mcp-server', 'mcp_', 'npx'];
  const foundProcesses = new Set<string>();
  
  for (const processName of runningProcesses) {
    for (const pattern of mcpPatterns) {
      if (processName.includes(pattern) && !foundProcesses.has(processName)) {
        foundProcesses.add(processName);
        servers.push({
          id: `running-${processName}-${Date.now()}`,
          name: processName,
          command: processName,
          args: [],
          status: 'running',
          configPath: 'detected-from-process',
          source: 'Running Process',
        });
        break;
      }
    }
  }

  return servers;
}

function getSourceName(source: string): string {
  if (source.includes('kiro')) return 'Kiro';
  if (source.includes('claude_desktop')) return 'Claude Desktop';
  if (source.includes('cline_vscode')) return 'Cline (VS Code)';
  if (source.includes('roo_cline')) return 'Roo Cline';
  if (source.includes('roo_code')) return 'Roo Code';
  if (source.includes('vscode_mcp')) return 'VS Code MCP';
  if (source.includes('zed')) return 'Zed';
  if (source.includes('cursor')) return 'Cursor';
  if (source.includes('windsurf')) return 'Windsurf';
  if (source.includes('continue')) return 'Continue.dev';
  if (source.includes('antigravity')) return 'Antigravity';
  if (source.includes('gemini_cli')) return 'Gemini CLI';
  if (source.includes('codex_cli')) return 'Codex CLI';
  return 'Unknown';
}

async function scanToolzSiblingServers(existingServers: MCPServer[], seenIds: Set<string>): Promise<MCPServer[]> {
  try {
    const cwd = process.cwd();
    const toolzDir = path.resolve(cwd, '..');
    if (path.basename(toolzDir).toLowerCase() !== 'toolz') {
      return [];
    }

    const entries = await fs.readdir(toolzDir, { withFileTypes: true });
    const existingScriptPaths = new Set<string>();
    for (const s of existingServers) {
      if (s.args && s.args.length > 0 && typeof s.args[0] === 'string' && s.args[0].toLowerCase().endsWith('.py')) {
        try {
          existingScriptPaths.add(path.resolve(s.args[0]).toLowerCase());
        } catch {
          // ignore
        }
      }
    }

    const discovered: MCPServer[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue;
      if (entry.name.toLowerCase() === 'node_modules') continue;

      const serverPy = path.join(toolzDir, entry.name, 'server.py');
      try {
        await fs.access(serverPy);
      } catch {
        continue;
      }

      const resolved = path.resolve(serverPy).toLowerCase();
      if (existingScriptPaths.has(resolved)) {
        continue;
      }

      const name = entry.name;
      const command = 'python';
      const args = [serverPy];
      const serverId = `${name}-${command}-${serverPy}`.replace(/[^a-zA-Z0-9-_]/g, '_');

      if (seenIds.has(serverId)) {
        continue;
      }
      seenIds.add(serverId);

      discovered.push({
        id: serverId,
        name,
        command,
        args,
        env: {},
        status: 'stale',
        configPath: serverPy,
        disabled: false,
        autoApprove: [],
        source: 'Toolz',
      });
    }

    return discovered;
  } catch (error) {
    console.warn('Toolz auto-discovery failed:', (error as Error).message);
    return [];
  }
}
