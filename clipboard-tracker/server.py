#!/usr/bin/env python3
"""
Clipboard Tracker MCP Server
Tracks clipboard changes with context (app, window, browser tab, timestamp)
"""

import asyncio
import json
import sqlite3
import sys
from datetime import datetime
from pathlib import Path
import pyperclip
import psutil
import win32gui
import win32process
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# Database setup
DB_PATH = Path.home() / ".julia" / "clipboard_tracker.db"
DB_PATH.parent.mkdir(exist_ok=True)

def init_database():
    """Initialize SQLite database for clipboard history"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS clipboard_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            app_name TEXT,
            window_title TEXT,
            process_name TEXT,
            browser_url TEXT,
            browser_tab TEXT,
            content_type TEXT,
            content_length INTEGER
        )
    """)
    
    conn.commit()
    conn.close()

def get_active_window_info():
    """Get information about the currently active window"""
    try:
        # Get active window handle
        hwnd = win32gui.GetForegroundWindow()
        
        # Get window title
        window_title = win32gui.GetWindowText(hwnd)
        
        # Get process ID
        _, pid = win32process.GetWindowThreadProcessId(hwnd)
        
        # Get process info
        try:
            process = psutil.Process(pid)
            app_name = process.name()
            process_name = process.exe()
        except:
            app_name = "Unknown"
            process_name = "Unknown"
        
        # Check if it's a browser and try to get URL/tab info
        browser_url = None
        browser_tab = None
        
        if any(browser in app_name.lower() for browser in ['chrome', 'firefox', 'edge', 'brave', 'opera']):
            # Extract URL from window title (works for most browsers)
            # Format is usually: "Page Title - Browser Name"
            if ' - ' in window_title:
                browser_tab = window_title.split(' - ')[0]
            else:
                browser_tab = window_title
        
        return {
            'app_name': app_name,
            'window_title': window_title,
            'process_name': process_name,
            'browser_url': browser_url,
            'browser_tab': browser_tab
        }
    except Exception as e:
        print(f"Error getting window info: {e}", file=sys.stderr)
        return {
            'app_name': 'Unknown',
            'window_title': 'Unknown',
            'process_name': 'Unknown',
            'browser_url': None,
            'browser_tab': None
        }

def save_clipboard_entry(content, window_info):
    """Save clipboard entry to database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Determine content type
    content_type = 'text'
    if content.startswith('http://') or content.startswith('https://'):
        content_type = 'url'
    elif '\n' in content and len(content) > 100:
        content_type = 'multiline'
    
    cursor.execute("""
        INSERT INTO clipboard_history 
        (content, app_name, window_title, process_name, browser_url, browser_tab, content_type, content_length)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        content[:5000],  # Limit content to 5000 chars
        window_info['app_name'],
        window_info['window_title'],
        window_info['process_name'],
        window_info['browser_url'],
        window_info['browser_tab'],
        content_type,
        len(content)
    ))
    
    conn.commit()
    conn.close()

async def monitor_clipboard():
    """Background task to monitor clipboard changes"""
    last_content = ""
    
    while True:
        try:
            current_content = pyperclip.paste()
            
            # Check if clipboard content changed
            if current_content and current_content != last_content:
                # Get active window info
                window_info = get_active_window_info()
                
                # Save to database
                save_clipboard_entry(current_content, window_info)
                
                print(
                    f"[Clipboard] Copied from {window_info['app_name']}: {current_content[:50]}...",
                    file=sys.stderr
                )
                
                last_content = current_content
            
            # Check every 500ms
            await asyncio.sleep(0.5)
            
        except Exception as e:
            print(f"Error monitoring clipboard: {e}", file=sys.stderr)
            await asyncio.sleep(1)

# MCP Server
app = Server("clipboard-tracker")

@app.list_tools()
async def list_tools() -> list[Tool]:
    """List available clipboard tracking tools"""
    return [
        Tool(
            name="get_clipboard_history",
            description="Get clipboard history with context (app, window, time)",
            inputSchema={
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "number",
                        "description": "Number of items to return (default: 10)"
                    },
                    "app_filter": {
                        "type": "string",
                        "description": "Filter by app name (optional)"
                    },
                    "content_type": {
                        "type": "string",
                        "description": "Filter by content type: text, url, multiline (optional)"
                    }
                }
            }
        ),
        Tool(
            name="search_clipboard",
            description="Search clipboard history by content",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query"
                    },
                    "limit": {
                        "type": "number",
                        "description": "Number of results (default: 10)"
                    }
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="get_clipboard_stats",
            description="Get statistics about clipboard usage",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="clear_clipboard_history",
            description="Clear clipboard history (with confirmation)",
            inputSchema={
                "type": "object",
                "properties": {
                    "confirm": {
                        "type": "boolean",
                        "description": "Must be true to confirm deletion"
                    }
                },
                "required": ["confirm"]
            }
        )
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Handle tool calls"""
    
    if name == "get_clipboard_history":
        limit = arguments.get("limit", 10)
        app_filter = arguments.get("app_filter")
        content_type = arguments.get("content_type")
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        query = "SELECT * FROM clipboard_history WHERE 1=1"
        params = []
        
        if app_filter:
            query += " AND app_name LIKE ?"
            params.append(f"%{app_filter}%")
        
        if content_type:
            query += " AND content_type = ?"
            params.append(content_type)
        
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        items = []
        for row in rows:
            items.append({
                'id': row[0],
                'content': row[1][:200] + ('...' if len(row[1]) > 200 else ''),
                'timestamp': row[2],
                'app': row[3],
                'window': row[4],
                'browser_tab': row[7] if row[7] else None,
                'type': row[8],
                'length': row[9]
            })
        
        return [TextContent(
            type="text",
            text=json.dumps({
                'success': True,
                'items': items,
                'count': len(items)
            }, indent=2)
        )]
    
    elif name == "search_clipboard":
        query = arguments.get("query", "")
        limit = arguments.get("limit", 10)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM clipboard_history 
            WHERE content LIKE ? 
            ORDER BY timestamp DESC 
            LIMIT ?
        """, (f"%{query}%", limit))
        
        rows = cursor.fetchall()
        conn.close()
        
        items = []
        for row in rows:
            items.append({
                'id': row[0],
                'content': row[1][:200] + ('...' if len(row[1]) > 200 else ''),
                'timestamp': row[2],
                'app': row[3],
                'window': row[4],
                'browser_tab': row[7] if row[7] else None
            })
        
        return [TextContent(
            type="text",
            text=json.dumps({
                'success': True,
                'query': query,
                'items': items,
                'count': len(items)
            }, indent=2)
        )]
    
    elif name == "get_clipboard_stats":
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Total entries
        cursor.execute("SELECT COUNT(*) FROM clipboard_history")
        total = cursor.fetchone()[0]
        
        # Most used apps
        cursor.execute("""
            SELECT app_name, COUNT(*) as count 
            FROM clipboard_history 
            GROUP BY app_name 
            ORDER BY count DESC 
            LIMIT 5
        """)
        top_apps = [{'app': row[0], 'count': row[1]} for row in cursor.fetchall()]
        
        # Content types
        cursor.execute("""
            SELECT content_type, COUNT(*) as count 
            FROM clipboard_history 
            GROUP BY content_type
        """)
        content_types = [{'type': row[0], 'count': row[1]} for row in cursor.fetchall()]
        
        conn.close()
        
        return [TextContent(
            type="text",
            text=json.dumps({
                'success': True,
                'total_entries': total,
                'top_apps': top_apps,
                'content_types': content_types
            }, indent=2)
        )]
    
    elif name == "clear_clipboard_history":
        if not arguments.get("confirm"):
            return [TextContent(
                type="text",
                text=json.dumps({
                    'success': False,
                    'error': 'Must confirm deletion with confirm=true'
                })
            )]
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM clipboard_history")
        deleted = cursor.rowcount
        conn.commit()
        conn.close()
        
        return [TextContent(
            type="text",
            text=json.dumps({
                'success': True,
                'deleted': deleted,
                'message': f'Deleted {deleted} clipboard entries'
            })
        )]
    
    return [TextContent(
        type="text",
        text=json.dumps({'error': f'Unknown tool: {name}'})
    )]

async def main():
    """Main entry point"""
    print("Starting Clipboard Tracker MCP Server...", file=sys.stderr)
    
    # Initialize database
    init_database()
    
    # Start clipboard monitoring in background
    asyncio.create_task(monitor_clipboard())
    
    # Start MCP server
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
