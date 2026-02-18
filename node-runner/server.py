#!/usr/bin/env python3
"""
Node Runner MCP Server
Runs Node.js/npm/npx commands and returns their output.
Designed for Antigravity (Gemini agent) to reliably run builds, tests, and scripts.

Usage: python server.py
Transport: stdio (JSONRPC 2.0)
"""

import sys
import json
import subprocess
import os
import time
import threading

# Build an environment that includes common Node.js paths
def get_node_env():
    """Build subprocess environment with Node.js on PATH."""
    env = dict(os.environ)
    env["PAGER"] = "cat"
    env["CI"] = "true"
    env["FORCE_COLOR"] = "0"
    
    # Common Node.js install locations on Windows
    extra_paths = []
    home = os.path.expanduser("~")
    program_files = os.environ.get("ProgramFiles", "C:\\Program Files")
    program_files_x86 = os.environ.get("ProgramFiles(x86)", "C:\\Program Files (x86)")
    appdata = os.environ.get("APPDATA", os.path.join(home, "AppData", "Roaming"))
    localappdata = os.environ.get("LOCALAPPDATA", os.path.join(home, "AppData", "Local"))
    
    node_candidates = [
        os.path.join(program_files, "nodejs"),
        os.path.join(program_files_x86, "nodejs"),
        os.path.join(appdata, "npm"),
        os.path.join(localappdata, "fnm"),
        os.path.join(home, ".nvm"),
        os.path.join(home, ".fnm"),
    ]
    
    # Also check for fnm/nvm managed versions
    fnm_dir = os.path.join(localappdata, "fnm_multishells")
    if os.path.isdir(fnm_dir):
        for d in os.listdir(fnm_dir):
            full = os.path.join(fnm_dir, d)
            if os.path.isdir(full):
                extra_paths.append(full)
    
    for candidate in node_candidates:
        if os.path.isdir(candidate):
            extra_paths.append(candidate)
    
    if extra_paths:
        env["PATH"] = ";".join(extra_paths) + ";" + env.get("PATH", "")
    
    return env

NODE_ENV = get_node_env()

def send_response(response):
    """Send a JSONRPC response to stdout."""
    msg = json.dumps(response)
    sys.stdout.write(msg + "\n")
    sys.stdout.flush()

def send_error(id, code, message):
    """Send a JSONRPC error response."""
    send_response({
        "jsonrpc": "2.0",
        "id": id,
        "error": {"code": code, "message": message}
    })

def send_result(id, result):
    """Send a JSONRPC success response."""
    send_response({
        "jsonrpc": "2.0",
        "id": id,
        "result": result
    })

# ─── Tool Definitions ────────────────────────────────────────

TOOLS = [
    {
        "name": "run_node_command",
        "description": "Run a Node.js related command (node, npm, npx, yarn, pnpm) in a specified directory. Returns stdout, stderr, and exit code. Has a configurable timeout (default 60s).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "The command to run (e.g., 'npx vite build', 'npm test', 'node script.js')"
                },
                "cwd": {
                    "type": "string",
                    "description": "Working directory to run the command in (absolute path)"
                },
                "timeout": {
                    "type": "integer",
                    "description": "Timeout in seconds (default: 60, max: 300)",
                    "default": 60
                }
            },
            "required": ["command", "cwd"]
        }
    },
    {
        "name": "npm_install",
        "description": "Run npm install in a directory. Shortcut for common operation.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "cwd": {
                    "type": "string",
                    "description": "Working directory (absolute path to project)"
                },
                "packages": {
                    "type": "string",
                    "description": "Optional: specific packages to install (e.g., 'react react-dom')"
                },
                "dev": {
                    "type": "boolean",
                    "description": "Install as dev dependency (default: false)",
                    "default": False
                }
            },
            "required": ["cwd"]
        }
    },
    {
        "name": "vite_build",
        "description": "Run a Vite build in a directory. Returns build output including any errors or warnings.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "cwd": {
                    "type": "string",
                    "description": "Working directory (absolute path to Vite project)"
                }
            },
            "required": ["cwd"]
        }
    },
    {
        "name": "npm_test",
        "description": "Run npm test or a specific test command in a directory.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "cwd": {
                    "type": "string",
                    "description": "Working directory (absolute path to project)"
                },
                "test_command": {
                    "type": "string",
                    "description": "Custom test command (default: 'npm test')",
                    "default": "npm test"
                }
            },
            "required": ["cwd"]
        }
    },
    {
        "name": "check_node_version",
        "description": "Check installed versions of Node.js, npm, npx, and optionally yarn/pnpm.",
        "inputSchema": {
            "type": "object",
            "properties": {},
        }
    }
]

# ─── Tool Handlers ────────────────────────────────────────────

def run_command(command, cwd, timeout=60):
    """Execute a command and return output."""
    timeout = min(max(timeout, 5), 300)  # Clamp 5-300s
    
    # Validate the directory exists
    if not os.path.isdir(cwd):
        return {
            "success": False,
            "error": f"Directory not found: {cwd}",
            "stdout": "",
            "stderr": "",
            "exit_code": -1,
            "duration_ms": 0
        }
    
    start = time.time()
    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=NODE_ENV
        )
        duration = int((time.time() - start) * 1000)
        
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout[-5000:] if len(result.stdout) > 5000 else result.stdout,
            "stderr": result.stderr[-2000:] if len(result.stderr) > 2000 else result.stderr,
            "exit_code": result.returncode,
            "duration_ms": duration,
            "truncated": len(result.stdout) > 5000
        }
    except subprocess.TimeoutExpired:
        duration = int((time.time() - start) * 1000)
        return {
            "success": False,
            "error": f"Command timed out after {timeout}s",
            "stdout": "",
            "stderr": "",
            "exit_code": -1,
            "duration_ms": duration
        }
    except Exception as e:
        duration = int((time.time() - start) * 1000)
        return {
            "success": False,
            "error": str(e),
            "stdout": "",
            "stderr": "",
            "exit_code": -1,
            "duration_ms": duration
        }

def handle_run_node_command(args):
    command = args.get("command", "")
    cwd = args.get("cwd", ".")
    timeout = args.get("timeout", 60)
    return run_command(command, cwd, timeout)

def handle_npm_install(args):
    cwd = args.get("cwd", ".")
    packages = args.get("packages", "")
    dev = args.get("dev", False)
    
    cmd = "npm install"
    if packages:
        cmd += f" {packages}"
    if dev:
        cmd += " --save-dev"
    
    return run_command(cmd, cwd, timeout=120)

def handle_vite_build(args):
    cwd = args.get("cwd", ".")
    return run_command("npx vite build", cwd, timeout=120)

def handle_npm_test(args):
    cwd = args.get("cwd", ".")
    test_command = args.get("test_command", "npm test")
    return run_command(test_command, cwd, timeout=120)

def handle_check_node_version(args):
    versions = {}
    for cmd_name, cmd in [("node", "node --version"), ("npm", "npm --version"), ("npx", "npx --version")]:
        try:
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10, env=NODE_ENV)
            versions[cmd_name] = result.stdout.strip() if result.returncode == 0 else "not found"
        except:
            versions[cmd_name] = "not found"
    
    # Optional: check yarn and pnpm
    for cmd_name in ["yarn", "pnpm"]:
        try:
            result = subprocess.run(f"{cmd_name} --version", shell=True, capture_output=True, text=True, timeout=10, env=NODE_ENV)
            if result.returncode == 0:
                versions[cmd_name] = result.stdout.strip()
        except:
            pass
    
    return {"versions": versions}

TOOL_HANDLERS = {
    "run_node_command": handle_run_node_command,
    "npm_install": handle_npm_install,
    "vite_build": handle_vite_build,
    "npm_test": handle_npm_test,
    "check_node_version": handle_check_node_version,
}

# ─── JSONRPC Handler ──────────────────────────────────────────

def handle_request(request):
    """Handle a single JSONRPC request."""
    method = request.get("method", "")
    id = request.get("id")
    params = request.get("params", {})
    
    if method == "initialize":
        send_result(id, {
            "protocolVersion": "2024-11-05",
            "capabilities": {"tools": {"listChanged": False}},
            "serverInfo": {
                "name": "node-runner",
                "version": "1.0.0"
            }
        })
    
    elif method == "notifications/initialized":
        pass  # No response needed
    
    elif method == "tools/list":
        send_result(id, {
            "tools": TOOLS
        })
    
    elif method == "tools/call":
        tool_name = params.get("name", "")
        tool_args = params.get("arguments", {})
        
        handler = TOOL_HANDLERS.get(tool_name)
        if not handler:
            send_result(id, {
                "content": [{"type": "text", "text": json.dumps({"error": f"Unknown tool: {tool_name}"})}],
                "isError": True
            })
            return
        
        try:
            result = handler(tool_args)
            send_result(id, {
                "content": [{"type": "text", "text": json.dumps(result, indent=2)}],
                "isError": not result.get("success", True) if isinstance(result, dict) else False
            })
        except Exception as e:
            send_result(id, {
                "content": [{"type": "text", "text": json.dumps({"error": str(e)})}],
                "isError": True
            })
    
    elif method == "ping":
        send_result(id, {})
    
    else:
        if id is not None:
            send_error(id, -32601, f"Method not found: {method}")

# ─── Main Loop ────────────────────────────────────────────────

def main():
    """Read JSONRPC messages from stdin, process them."""
    sys.stderr.write("[node-runner] MCP Server started\n")
    sys.stderr.flush()
    
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        
        try:
            request = json.loads(line)
            handle_request(request)
        except json.JSONDecodeError as e:
            sys.stderr.write(f"[node-runner] Invalid JSON: {e}\n")
            sys.stderr.flush()
        except Exception as e:
            sys.stderr.write(f"[node-runner] Error: {e}\n")
            sys.stderr.flush()

if __name__ == "__main__":
    main()
