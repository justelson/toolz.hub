# System Commander MCP Server

A simple Model Context Protocol (MCP) server for PC management and automation.

## Features

This MCP server provides 6 powerful tools:

1. **execute_command** - Run any shell command
2. **get_system_info** - View CPU, memory, disk usage, and OS details
3. **list_processes** - See all running processes with resource usage
4. **kill_process** - Terminate processes by name or PID
5. **search_files** - Find files by pattern in any directory
6. **get_network_info** - View network interfaces and active connections

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Add to your Kiro MCP config at `.kiro/settings/mcp.json`:
```json
{
  "mcpServers": {
    "system-commander": {
      "command": "python",
      "args": ["C:/path/to/system-commander/server.py"]
    }
  }
}
```

3. Restart Kiro or reconnect the MCP server from the MCP Server view

## Usage

Once configured, just talk to Kiro naturally:

- "What's my CPU usage?"
- "Show me all Chrome processes"
- "Kill notepad"
- "Find all PDF files in my Downloads folder"
- "What's my IP address?"
- "Run the command 'ipconfig'"

Kiro will automatically use the appropriate tools to help you.

## Safety

- Tools run with your user permissions (not admin by default)
- Commands have a 30-second timeout to prevent hanging
- **Dangerous commands are blocked** - Commands that could harm your system are automatically blocked
- **Long-running servers are blocked** - Commands like `npm run dev`, `yarn start`, `flask run`, etc. are automatically blocked to prevent hanging processes
- Process listing is limited to top 50 by memory usage
- File search is limited to 100 results

### Blocked Dangerous Commands

The following types of DANGEROUS commands are blocked for your safety:
- **Disk operations**: `format`, `diskpart`, `fdisk`
- **System file deletion**: `del /s`, `rmdir /s`, `rm -rf /`, deleting Windows/Program Files
- **Registry operations**: `reg delete`, `regedit /s`
- **Boot configuration**: `bcdedit`, `bootrec`, `dd if=`
- **Immediate shutdown/restart**: `shutdown /s /t 0`
- **PowerShell dangerous ops**: `Remove-Item -Recurse -Force`
- **Fork bombs**: Resource exhaustion attacks

### Blocked Long-Running Commands

The following types of commands are blocked to prevent hanging:
- Node.js dev servers: `npm run dev`, `npm start`, `yarn dev`, `nodemon`, etc.
- Python servers: `flask run`, `uvicorn`, `python -m http.server`, etc.
- Build watchers: `webpack --watch`, `vite`, `next dev`, etc.
- Static file servers: `serve`, `http-server`, `live-server`, etc.

These should be run manually in your terminal where you can monitor and control them.

## Requirements

- Python 3.8+
- Windows (tested), but should work on Linux/Mac with minor adjustments
- mcp library
- psutil library
