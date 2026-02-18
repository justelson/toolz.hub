#!/usr/bin/env python3
"""
System Commander MCP Server
A simple MCP server for PC management and automation
"""

import asyncio
import subprocess
import psutil
import os
import platform
from pathlib import Path
from datetime import datetime
from mcp.server import Server
from mcp.types import Tool, TextContent
from mcp.server.stdio import stdio_server

# Initialize MCP server
server = Server("system-commander")

@server.list_tools()
async def list_tools() -> list[Tool]:
    """List all available tools"""
    return [
        Tool(
            name="execute_command",
            description="Execute a shell command and return the output. Use for running any Windows command. NOTE: Long-running servers (npm run dev, yarn start, etc.) are blocked - run those manually in a terminal.",
            inputSchema={
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "The command to execute (e.g., 'dir', 'ipconfig', 'tasklist'). Long-running servers are not allowed."
                    }
                },
                "required": ["command"]
            }
        ),
        Tool(
            name="get_system_info",
            description="Get comprehensive system information including CPU, memory, disk usage, and OS details",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="list_processes",
            description="List all running processes with their PID, name, CPU and memory usage",
            inputSchema={
                "type": "object",
                "properties": {
                    "filter": {
                        "type": "string",
                        "description": "Optional: filter processes by name (case-insensitive)"
                    }
                }
            }
        ),
        Tool(
            name="kill_process",
            description="Terminate a process by name or PID",
            inputSchema={
                "type": "object",
                "properties": {
                    "identifier": {
                        "type": "string",
                        "description": "Process name (e.g., 'chrome.exe') or PID number"
                    }
                },
                "required": ["identifier"]
            }
        ),
        Tool(
            name="search_files",
            description="Search for files in a directory by name pattern",
            inputSchema={
                "type": "object",
                "properties": {
                    "directory": {
                        "type": "string",
                        "description": "Directory to search in (e.g., 'C:\\Users\\Username\\Downloads')"
                    },
                    "pattern": {
                        "type": "string",
                        "description": "File pattern to search for (e.g., '*.pdf', 'report*')"
                    },
                    "recursive": {
                        "type": "boolean",
                        "description": "Search subdirectories recursively (default: true)"
                    }
                },
                "required": ["directory", "pattern"]
            }
        ),
        Tool(
            name="read_file",
            description="Read a text file. Use this before editing to inspect current contents.",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path to the file to read"
                    },
                    "max_chars": {
                        "type": "integer",
                        "description": "Optional max characters to return (default: 20000)"
                    }
                },
                "required": ["path"]
            }
        ),
        Tool(
            name="write_file",
            description="Write text content to a file (create or overwrite).",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path to file"
                    },
                    "content": {
                        "type": "string",
                        "description": "Full file content to write"
                    },
                    "create_dirs": {
                        "type": "boolean",
                        "description": "Create parent directories if missing (default: true)"
                    }
                },
                "required": ["path", "content"]
            }
        ),
        Tool(
            name="append_file",
            description="Append text content to the end of a file.",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path to file"
                    },
                    "content": {
                        "type": "string",
                        "description": "Text to append"
                    },
                    "create_dirs": {
                        "type": "boolean",
                        "description": "Create parent directories if missing (default: true)"
                    }
                },
                "required": ["path", "content"]
            }
        ),
        Tool(
            name="replace_in_file",
            description="Replace text inside a file. Use for targeted edits.",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path to file"
                    },
                    "find": {
                        "type": "string",
                        "description": "Text to find"
                    },
                    "replace": {
                        "type": "string",
                        "description": "Replacement text"
                    },
                    "replace_all": {
                        "type": "boolean",
                        "description": "Replace all matches (default: true)"
                    }
                },
                "required": ["path", "find", "replace"]
            }
        ),
        Tool(
            name="get_network_info",
            description="Get network information including active connections and network interfaces",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        )
    ]

def is_dangerous_command(command: str) -> tuple[bool, str]:
    """Check if a command is dangerous and could harm the system"""
    command_lower = command.lower()
    
    # Skip check if it's just a file path
    if any(x in command_lower for x in ['get-content', 'type ', 'cat ', 'more ']):
        return False, ""
    
    # Dangerous/harmful commands
    dangerous_patterns = [
        # Disk/partition operations
        ('format ', 'Format disk - EXTREMELY DANGEROUS'),
        ('diskpart', 'Disk partition tool - DANGEROUS'),
        ('fdisk', 'Disk partition tool - DANGEROUS'),
        
        # System file deletion
        ('del /s', 'Recursive delete - DANGEROUS'),
        ('rmdir /s', 'Recursive directory removal - DANGEROUS'),
        ('rd /s', 'Recursive directory removal - DANGEROUS'),
        ('rm -rf /', 'Recursive force delete - EXTREMELY DANGEROUS'),
        ('rm -rf *', 'Recursive force delete all - EXTREMELY DANGEROUS'),
        ('del c:\\windows', 'Delete Windows system files - EXTREMELY DANGEROUS'),
        ('del c:\\program files', 'Delete Program Files - DANGEROUS'),
        
        # Registry operations
        ('reg delete', 'Registry deletion - DANGEROUS'),
        ('regedit /s', 'Silent registry import - DANGEROUS'),
        
        # System shutdown/restart without confirmation
        ('shutdown /s /t 0', 'Immediate shutdown'),
        ('shutdown /r /t 0', 'Immediate restart'),
        
        # Bootloader/MBR operations
        ('bootrec', 'Boot record operations - DANGEROUS'),
        ('bcdedit', 'Boot configuration - DANGEROUS'),
        ('dd if=', 'Direct disk write - EXTREMELY DANGEROUS'),
        
        # Encryption/disk operations
        ('cipher /w:', 'Wipe free space - DANGEROUS'),
        ('convert ', 'File system conversion - DANGEROUS'),
        
        # PowerShell dangerous operations
        ('remove-item -recurse -force', 'PowerShell recursive force delete - DANGEROUS'),
        ('get-childitem | remove-item', 'PowerShell bulk delete - DANGEROUS'),
        
        # Fork bombs and resource exhaustion
        (':(){ :|:& };:', 'Fork bomb - DANGEROUS'),
        ('%0|%0', 'Windows fork bomb - DANGEROUS'),
    ]
    
    for pattern, name in dangerous_patterns:
        if pattern in command_lower:
            return True, name
    
    return False, ""

def is_long_running_command(command: str) -> tuple[bool, str]:
    """Check if a command is likely to be a long-running server/process"""
    command_lower = command.lower()
    
    # Skip check if it's just reading a file with "server" in the path
    if any(x in command_lower for x in ['get-content', 'type ', 'cat ', 'more ', 'less ']):
        return False, ""
    
    # Blocked patterns for continuous servers
    blocked_patterns = [
        # Node.js servers
        ('npm run dev', 'npm run dev'),
        ('npm start', 'npm start'),
        ('yarn dev', 'yarn dev'),
        ('yarn start', 'yarn start'),
        ('pnpm dev', 'pnpm dev'),
        ('pnpm start', 'pnpm start'),
        ('node server', 'node server'),
        ('nodemon', 'nodemon'),
        
        # Python servers
        ('python -m http.server', 'Python HTTP server'),
        ('python manage.py runserver', 'Django dev server'),
        ('flask run', 'Flask dev server'),
        ('uvicorn', 'Uvicorn server'),
        ('gunicorn', 'Gunicorn server'),
        
        # Build watchers
        ('webpack --watch', 'Webpack watcher'),
        ('vite', 'Vite dev server'),
        ('next dev', 'Next.js dev server'),
        ('ng serve', 'Angular dev server'),
        
        # Other long-running processes
        ('serve', 'serve command'),
        ('http-server', 'http-server'),
        ('live-server', 'live-server'),
    ]
    
    for pattern, name in blocked_patterns:
        if pattern in command_lower:
            return True, name
    
    return False, ""

def is_gui_launch_command(command: str) -> tuple[bool, str]:
    """Block launching GUI apps for editing when file tools should be used instead."""
    command_lower = command.lower().strip()

    gui_patterns = [
        ('notepad', 'Notepad'),
        ('wordpad', 'WordPad'),
        ('code ', 'VS Code'),
        ('start notepad', 'Notepad'),
        ('start "" notepad', 'Notepad'),
        ('explorer ', 'Windows Explorer'),
        ('start "" explorer', 'Windows Explorer'),
    ]

    for pattern, name in gui_patterns:
        if pattern in command_lower:
            return True, name

    return False, ""

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Handle tool execution"""
    
    try:
        if name == "execute_command":
            command = arguments["command"]
            
            # Check for dangerous commands first
            is_danger, danger_name = is_dangerous_command(command)
            if is_danger:
                error_msg = f"""🛑 DANGEROUS COMMAND BLOCKED

Command: {command}
Reason: {danger_name}

This command has been permanently blocked. It will never be executed through this MCP server."""
                return [TextContent(type="text", text=error_msg)]
            
            # Check for long-running commands
            is_blocked, blocked_name = is_long_running_command(command)
            if is_blocked:
                error_msg = f"""❌ Command blocked: {blocked_name}

This command would start a long-running server/process, which is not allowed through this MCP server.

Blocked command: {command}

Why? Long-running servers should be started manually in a terminal where you can:
- Monitor their output in real-time
- Stop them with Ctrl+C when needed
- Keep them running in the background

Please run this command manually in your terminal instead."""
                return [TextContent(type="text", text=error_msg)]

            # Block GUI editor launches so agent uses dedicated file edit tools
            is_gui, gui_name = is_gui_launch_command(command)
            if is_gui:
                error_msg = f"""❌ GUI editor launch blocked: {gui_name}

Command: {command}

Use file tools instead:
- read_file
- write_file
- append_file
- replace_in_file

This keeps edits deterministic and auditable."""
                return [TextContent(type="text", text=error_msg)]
            
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )
            output = result.stdout if result.stdout else result.stderr
            return [TextContent(type="text", text=output or "Command executed with no output")]
        
        elif name == "get_system_info":
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            info = f"""System Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OS: {platform.system()} {platform.release()}
Machine: {platform.machine()}
Processor: {platform.processor()}

CPU Usage: {cpu_percent}%
CPU Cores: {psutil.cpu_count(logical=False)} physical, {psutil.cpu_count(logical=True)} logical

Memory:
  Total: {memory.total / (1024**3):.2f} GB
  Used: {memory.used / (1024**3):.2f} GB ({memory.percent}%)
  Available: {memory.available / (1024**3):.2f} GB

Disk:
  Total: {disk.total / (1024**3):.2f} GB
  Used: {disk.used / (1024**3):.2f} GB ({disk.percent}%)
  Free: {disk.free / (1024**3):.2f} GB

Boot Time: {datetime.fromtimestamp(psutil.boot_time()).strftime('%Y-%m-%d %H:%M:%S')}
"""
            return [TextContent(type="text", text=info)]
        
        elif name == "list_processes":
            filter_name = arguments.get("filter", "").lower()
            processes = []
            
            for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
                try:
                    if filter_name and filter_name not in proc.info['name'].lower():
                        continue
                    processes.append(proc.info)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            
            # Sort by memory usage
            processes.sort(key=lambda x: x['memory_percent'], reverse=True)
            
            output = "Running Processes:\n"
            output += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            output += f"{'PID':<8} {'Name':<30} {'CPU%':<8} {'Memory%':<10}\n"
            output += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            
            for proc in processes[:50]:  # Limit to top 50
                output += f"{proc['pid']:<8} {proc['name'][:29]:<30} {proc['cpu_percent']:<8.1f} {proc['memory_percent']:<10.2f}\n"
            
            if len(processes) > 50:
                output += f"\n... and {len(processes) - 50} more processes"
            
            return [TextContent(type="text", text=output)]
        
        elif name == "kill_process":
            identifier = arguments["identifier"]
            killed = []
            
            # Try as PID first
            try:
                pid = int(identifier)
                proc = psutil.Process(pid)
                name = proc.name()
                proc.terminate()
                killed.append(f"PID {pid} ({name})")
            except ValueError:
                # It's a process name
                for proc in psutil.process_iter(['pid', 'name']):
                    try:
                        if identifier.lower() in proc.info['name'].lower():
                            proc.terminate()
                            killed.append(f"PID {proc.info['pid']} ({proc.info['name']})")
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass
            except psutil.NoSuchProcess:
                return [TextContent(type="text", text=f"Process not found: {identifier}")]
            except psutil.AccessDenied:
                return [TextContent(type="text", text=f"Access denied. Try running with administrator privileges.")]
            
            if killed:
                return [TextContent(type="text", text=f"Terminated processes:\n" + "\n".join(killed))]
            else:
                return [TextContent(type="text", text=f"No processes found matching: {identifier}")]
        
        elif name == "search_files":
            directory = arguments["directory"]
            pattern = arguments["pattern"]
            recursive = arguments.get("recursive", True)
            
            import glob
            
            if not os.path.exists(directory):
                return [TextContent(type="text", text=f"Directory not found: {directory}")]
            
            search_pattern = os.path.join(directory, "**" if recursive else "", pattern)
            files = glob.glob(search_pattern, recursive=recursive)
            
            if not files:
                return [TextContent(type="text", text=f"No files found matching '{pattern}' in {directory}")]
            
            output = f"Found {len(files)} file(s):\n"
            output += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            
            for file in files[:100]:  # Limit to 100 results
                size = os.path.getsize(file) / 1024  # KB
                modified = datetime.fromtimestamp(os.path.getmtime(file)).strftime('%Y-%m-%d %H:%M')
                output += f"{file}\n  Size: {size:.2f} KB | Modified: {modified}\n\n"
            
            if len(files) > 100:
                output += f"... and {len(files) - 100} more files"
            
            return [TextContent(type="text", text=output)]

        elif name == "read_file":
            file_path = arguments["path"]
            max_chars = int(arguments.get("max_chars", 20000))
            path_obj = Path(file_path)

            if not path_obj.exists():
                return [TextContent(type="text", text=f"File not found: {file_path}")]
            if path_obj.is_dir():
                return [TextContent(type="text", text=f"Path is a directory, not a file: {file_path}")]

            content = path_obj.read_text(encoding="utf-8", errors="replace")
            truncated = False
            if len(content) > max_chars:
                content = content[:max_chars]
                truncated = True

            output = f"Read file: {path_obj}\n"
            output += f"Characters returned: {len(content)}"
            if truncated:
                output += f" (truncated from {path_obj.stat().st_size} bytes)"
            output += "\n\n"
            output += content
            return [TextContent(type="text", text=output)]

        elif name == "write_file":
            file_path = arguments["path"]
            content = arguments["content"]
            create_dirs = arguments.get("create_dirs", True)
            path_obj = Path(file_path)

            if create_dirs:
                path_obj.parent.mkdir(parents=True, exist_ok=True)

            path_obj.write_text(content, encoding="utf-8")
            return [TextContent(
                type="text",
                text=f"Wrote {len(content)} characters to {path_obj}"
            )]

        elif name == "append_file":
            file_path = arguments["path"]
            content = arguments["content"]
            create_dirs = arguments.get("create_dirs", True)
            path_obj = Path(file_path)

            if create_dirs:
                path_obj.parent.mkdir(parents=True, exist_ok=True)

            with path_obj.open("a", encoding="utf-8") as f:
                f.write(content)

            return [TextContent(
                type="text",
                text=f"Appended {len(content)} characters to {path_obj}"
            )]

        elif name == "replace_in_file":
            file_path = arguments["path"]
            find_text = arguments["find"]
            replace_text = arguments["replace"]
            replace_all = arguments.get("replace_all", True)
            path_obj = Path(file_path)

            if not path_obj.exists():
                return [TextContent(type="text", text=f"File not found: {file_path}")]
            if path_obj.is_dir():
                return [TextContent(type="text", text=f"Path is a directory, not a file: {file_path}")]

            original = path_obj.read_text(encoding="utf-8", errors="replace")

            if find_text not in original:
                return [TextContent(type="text", text=f"No matches found in {path_obj}")]

            if replace_all:
                updated = original.replace(find_text, replace_text)
            else:
                updated = original.replace(find_text, replace_text, 1)

            replacements = original.count(find_text) if replace_all else 1
            path_obj.write_text(updated, encoding="utf-8")

            return [TextContent(
                type="text",
                text=f"Replaced {replacements} occurrence(s) in {path_obj}"
            )]
        
        elif name == "get_network_info":
            # Network interfaces
            interfaces = psutil.net_if_addrs()
            stats = psutil.net_if_stats()
            
            output = "Network Information:\n"
            output += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            
            for interface_name, addresses in interfaces.items():
                if interface_name in stats:
                    stat = stats[interface_name]
                    output += f"Interface: {interface_name}\n"
                    output += f"  Status: {'Up' if stat.isup else 'Down'}\n"
                    output += f"  Speed: {stat.speed} Mbps\n"
                    
                    for addr in addresses:
                        if addr.family == 2:  # IPv4
                            output += f"  IPv4: {addr.address}\n"
                        elif addr.family == 23:  # IPv6
                            output += f"  IPv6: {addr.address}\n"
                    output += "\n"
            
            # Network connections
            connections = psutil.net_connections(kind='inet')
            active_connections = [c for c in connections if c.status == 'ESTABLISHED']
            
            output += f"\nActive Connections: {len(active_connections)}\n"
            output += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            
            for conn in active_connections[:20]:  # Show top 20
                local = f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else "N/A"
                remote = f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else "N/A"
                output += f"{local} → {remote}\n"
            
            if len(active_connections) > 20:
                output += f"... and {len(active_connections) - 20} more connections\n"
            
            return [TextContent(type="text", text=output)]
        
        else:
            return [TextContent(type="text", text=f"Unknown tool: {name}")]
    
    except Exception as e:
        return [TextContent(type="text", text=f"Error executing {name}: {str(e)}")]

async def main():
    """Run the MCP server"""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())
