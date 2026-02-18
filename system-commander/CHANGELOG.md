# Changelog

## [Unreleased] - 2026-02-02

### Added
- **🛑 DANGEROUS COMMAND BLOCKING**: Automatically blocks commands that could seriously harm your system
  - Disk operations (format, diskpart, fdisk)
  - System file deletion (del /s, rmdir /s, rm -rf /)
  - Registry operations (reg delete, regedit /s)
  - Boot configuration changes (bcdedit, bootrec, dd)
  - Immediate shutdown/restart commands
  - PowerShell dangerous operations
  - Fork bombs and resource exhaustion attacks
  
- **Command blocking for long-running servers**: The MCP server now automatically blocks commands that would start continuous/long-running processes
- Blocked command types include:
  - Node.js dev servers (npm run dev, yarn start, nodemon, etc.)
  - Python servers (flask run, uvicorn, Django runserver, etc.)
  - Build watchers (webpack --watch, vite, next dev, etc.)
  - Static file servers (serve, http-server, live-server, etc.)
  
- Clear error messages when blocked commands are attempted
- Comprehensive test script to verify all blocking logic

### Changed
- Updated `execute_command` tool description to mention blocking
- Enhanced README with detailed safety information about blocked commands
- Dangerous commands are checked BEFORE long-running commands for priority

### Why?
**Dangerous commands** could cause permanent damage to your system, delete critical files, or make your computer unbootable. They should only be run with full understanding and proper backups.

**Long-running servers** should be started manually in a terminal where users can:
- Monitor output in real-time
- Stop them with Ctrl+C when needed
- Keep them running in the background
- Avoid hanging the MCP server process
