#!/usr/bin/env python3
"""Test script to verify command blocking logic"""

def is_dangerous_command(command: str) -> tuple[bool, str]:
    """Check if a command is dangerous and could harm the system"""
    command_lower = command.lower()
    
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

# Test cases
print("=" * 70)
print("TESTING DANGEROUS COMMANDS")
print("=" * 70)

dangerous_test_commands = [
    "format c:",
    "diskpart",
    "del /s C:\\Windows",
    "rmdir /s /q C:\\Users",
    "rm -rf /",
    "reg delete HKLM\\Software",
    "shutdown /s /t 0",
    "bcdedit /delete",
    "dd if=/dev/zero of=/dev/sda",
    "Remove-Item -Recurse -Force C:\\",
]

for cmd in dangerous_test_commands:
    is_danger, name = is_dangerous_command(cmd)
    status = "🛑 BLOCKED" if is_danger else "⚠️  NOT CAUGHT"
    reason = f" ({name})" if is_danger else ""
    print(f"{status:<20} {cmd}{reason}")

print("\n" + "=" * 70)
print("TESTING LONG-RUNNING COMMANDS")
print("=" * 70)

server_test_commands = [
    "npm run dev",
    "npm start",
    "yarn dev",
    "node server.js",
    "nodemon app.js",
    "python -m http.server",
    "flask run",
]

for cmd in server_test_commands:
    is_blocked, name = is_long_running_command(cmd)
    status = "🚫 BLOCKED" if is_blocked else "✅ ALLOWED"
    reason = f" ({name})" if is_blocked else ""
    print(f"{status:<20} {cmd}{reason}")

print("\n" + "=" * 70)
print("TESTING SAFE COMMANDS (should all be allowed)")
print("=" * 70)

safe_test_commands = [
    "npm run build",
    "npm install",
    "dir",
    "ipconfig",
    "echo hello",
    "git status",
    "python script.py",
]

for cmd in safe_test_commands:
    is_danger, _ = is_dangerous_command(cmd)
    is_blocked, _ = is_long_running_command(cmd)
    status = "✅ ALLOWED" if not (is_danger or is_blocked) else "❌ INCORRECTLY BLOCKED"
    print(f"{status:<20} {cmd}")

print("=" * 70)
