#!/usr/bin/env python3
"""
Workflow Assistant MCP Server
Productivity tools for AI-assisted PC usage
"""

import asyncio
import os
import json
import subprocess
import uuid
from datetime import datetime, timezone
from pathlib import Path
from mcp.server import Server
from mcp.types import Tool, TextContent
from mcp.server.stdio import stdio_server

# Initialize MCP server
server = Server("workflow-assistant")

# Storage paths
STORAGE_DIR = Path.home() / ".workflow-assistant"
STORAGE_DIR.mkdir(exist_ok=True)
CLIPBOARD_HISTORY = STORAGE_DIR / "clipboard_history.json"
QUICK_NOTES = STORAGE_DIR / "quick_notes.json"
BOOKMARKS = STORAGE_DIR / "bookmarks.json"

def _get_history_limit() -> int:
    """Get clipboard history limit from env, default 20."""
    raw = os.getenv("WORKFLOW_ASSISTANT_HISTORY_LIMIT", "20")
    try:
        value = int(raw)
        return max(1, value)
    except ValueError:
        return 20

HISTORY_LIMIT = _get_history_limit()

@server.list_tools()
async def list_tools() -> list[Tool]:
    """List all available tools"""
    return [
        Tool(
            name="clipboard_read",
            description="Read the current clipboard content",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="clipboard_write",
            description="Write text to the clipboard",
            inputSchema={
                "type": "object",
                "properties": {
                    "text": {
                        "type": "string",
                        "description": "Text to copy to clipboard"
                    }
                },
                "required": ["text"]
            }
        ),
        Tool(
            name="clipboard_history",
            description="View recent clipboard history (up to configured limit)",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="quick_note",
            description="Save a quick note with optional tags",
            inputSchema={
                "type": "object",
                "properties": {
                    "content": {
                        "type": "string",
                        "description": "Note content"
                    },
                    "tags": {
                        "type": "string",
                        "description": "Comma-separated tags (optional)"
                    }
                },
                "required": ["content"]
            }
        ),
        Tool(
            name="list_notes",
            description="List all quick notes, optionally filtered by tag",
            inputSchema={
                "type": "object",
                "properties": {
                    "tag": {
                        "type": "string",
                        "description": "Filter by tag (optional)"
                    }
                }
            }
        ),
        Tool(
            name="delete_note",
            description="Delete a note by its ID",
            inputSchema={
                "type": "object",
                "properties": {
                    "note_id": {
                        "type": "string",
                        "description": "Note ID to delete"
                    }
                },
                "required": ["note_id"]
            }
        ),
        Tool(
            name="bookmark_add",
            description="Add a bookmark (file path, URL, or command)",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Bookmark name"
                    },
                    "target": {
                        "type": "string",
                        "description": "File path, URL, or command"
                    },
                    "type": {
                        "type": "string",
                        "description": "Type: 'file', 'url', or 'command'"
                    },
                    "tags": {
                        "type": "string",
                        "description": "Comma-separated tags (optional)"
                    }
                },
                "required": ["name", "target", "type"]
            }
        ),
        Tool(
            name="bookmark_list",
            description="List all bookmarks, optionally filtered by tag or type",
            inputSchema={
                "type": "object",
                "properties": {
                    "tag": {
                        "type": "string",
                        "description": "Filter by tag (optional)"
                    },
                    "type": {
                        "type": "string",
                        "description": "Filter by type: 'file', 'url', or 'command' (optional)"
                    }
                }
            }
        ),
        Tool(
            name="bookmark_open",
            description="Open a bookmark by name",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Bookmark name"
                    },
                    "confirm": {
                        "type": "boolean",
                        "description": "Required for command bookmarks"
                    }
                },
                "required": ["name"]
            }
        ),
        Tool(
            name="open_file_location",
            description="Open a file or folder in Windows Explorer",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "File or folder path"
                    }
                },
                "required": ["path"]
            }
        ),
        Tool(
            name="recent_files",
            description="List recently modified files in a directory",
            inputSchema={
                "type": "object",
                "properties": {
                    "directory": {
                        "type": "string",
                        "description": "Directory to search"
                    },
                    "hours": {
                        "type": "number",
                        "description": "Look back this many hours (default: 24)"
                    },
                    "extension": {
                        "type": "string",
                        "description": "Filter by file extension (e.g., '.py', '.txt')"
                    }
                }
            }
        ),
        Tool(
            name="create_workspace",
            description="Create a new project workspace with common folders",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Base path for the workspace"
                    },
                    "name": {
                        "type": "string",
                        "description": "Workspace name"
                    },
                    "folders": {
                        "type": "string",
                        "description": "Comma-separated folder names (default: 'src,docs,tests')"
                    }
                },
                "required": ["path", "name"]
            }
        )
    ]

def load_json_file(filepath: Path) -> list:
    """Load JSON file or return empty list"""
    if filepath.exists():
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return []
    return []

def save_json_file(filepath: Path, data: list):
    """Save data to JSON file (atomic write)"""
    tmp_path = filepath.with_suffix(filepath.suffix + ".tmp")
    with open(tmp_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.replace(tmp_path, filepath)

def _now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def _normalize_tags(tags_value) -> list[str]:
    if isinstance(tags_value, list):
        raw_tags = tags_value
    else:
        raw_tags = str(tags_value or "").split(",")
    tags = [t.strip() for t in raw_tags if t and str(t).strip()]
    return tags

def _tags_key(tags: list[str]) -> tuple:
    return tuple(sorted([t.lower() for t in tags]))

def _content_key(content: str) -> str:
    return content.strip().casefold()

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Handle tool execution"""
    
    try:
        if name == "clipboard_read":
            result = subprocess.run(
                ["powershell", "-command", "Get-Clipboard"],
                capture_output=True,
                text=True
            )
            content = result.stdout.strip()
            
            # Save to history
            history = load_json_file(CLIPBOARD_HISTORY)
            if content and (not history or history[0].get("content") != content):
                history.insert(0, {
                    "content": content,
                    "timestamp": _now_utc_iso()
                })
                history = history[:HISTORY_LIMIT]
                save_json_file(CLIPBOARD_HISTORY, history)
            
            return [TextContent(type="text", text=content or "Clipboard is empty")]
        
        elif name == "clipboard_write":
            text = arguments["text"]
            subprocess.run(
                ["powershell", "-command", f"Set-Clipboard -Value '{text}'"],
                check=True
            )
            
            # Save to history
            history = load_json_file(CLIPBOARD_HISTORY)
            history.insert(0, {
                "content": text,
                "timestamp": _now_utc_iso()
            })
            history = history[:HISTORY_LIMIT]
            save_json_file(CLIPBOARD_HISTORY, history)
            
            return [TextContent(type="text", text=f"✓ Copied to clipboard: {text[:50]}...")]
        
        elif name == "clipboard_history":
            history = load_json_file(CLIPBOARD_HISTORY)
            if not history:
                return [TextContent(type="text", text="No clipboard history")]
            
            output = "Clipboard History:\n" + "=" * 60 + "\n\n"
            for i, item in enumerate(history[:HISTORY_LIMIT], 1):
                timestamp = datetime.fromisoformat(item["timestamp"]).astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
                content = item["content"][:100]
                output += f"{i}. [{timestamp}]\n{content}\n\n"
            
            return [TextContent(type="text", text=output)]
        
        elif name == "quick_note":
            notes = load_json_file(QUICK_NOTES)
            content = arguments["content"].strip()
            if not content:
                return [TextContent(type="text", text="Note content is empty")]

            tags = _normalize_tags(arguments.get("tags", ""))
            tags_key = _tags_key(tags)
            content_key = _content_key(content)

            for note in notes:
                if _content_key(note.get("content", "")) == content_key and _tags_key(note.get("tags", [])) == tags_key:
                    return [TextContent(type="text", text=f"Note already exists (ID: {note.get('id')})")]

            note_id = uuid.uuid4().hex

            note = {
                "id": note_id,
                "content": content,
                "tags": tags,
                "created": _now_utc_iso()
            }

            notes.insert(0, note)
            save_json_file(QUICK_NOTES, notes)

            return [TextContent(type="text", text=f"Note saved (ID: {note_id})")]

        elif name == "list_notes":
            notes = load_json_file(QUICK_NOTES)
            tag_filter = arguments.get("tag", "").lower()
            
            if tag_filter:
                notes = [n for n in notes if tag_filter in [t.lower() for t in n.get("tags", [])]]
            
            if not notes:
                return [TextContent(type="text", text="No notes found")]
            
            output = f"Quick Notes ({len(notes)}):\n" + "=" * 60 + "\n\n"
            for note in notes:
                timestamp = datetime.fromisoformat(note["created"]).astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
                tags = ", ".join(note.get("tags", [])) or "no tags"
                output += f"ID: {note['id']} | {timestamp} | [{tags}]\n"
                output += f"{note['content']}\n\n"
            
            return [TextContent(type="text", text=output)]
        
        elif name == "delete_note":
            notes = load_json_file(QUICK_NOTES)
            note_id = arguments["note_id"]
            
            notes = [n for n in notes if n["id"] != note_id]
            save_json_file(QUICK_NOTES, notes)
            
            return [TextContent(type="text", text=f"✓ Note {note_id} deleted")]
        
        elif name == "bookmark_add":
            bookmarks = load_json_file(BOOKMARKS)
            bm_type = arguments["type"].lower()
            if bm_type not in {"file", "url", "command"}:
                return [TextContent(type="text", text="Invalid bookmark type. Use 'file', 'url', or 'command'.")]

            name = arguments["name"].strip()
            target = arguments["target"].strip()
            if not name or not target:
                return [TextContent(type="text", text="Bookmark name and target are required")]

            for bm in bookmarks:
                if bm.get("name", "").lower() == name.lower():
                    return [TextContent(type="text", text=f"Bookmark name already exists: {name}")]
                if bm.get("type", "").lower() == bm_type and bm.get("target", "") == target:
                    return [TextContent(type="text", text=f"Bookmark target already exists for type '{bm_type}'")]

            tags = _normalize_tags(arguments.get("tags", ""))

            bookmark = {
                "id": uuid.uuid4().hex,
                "name": name,
                "target": target,
                "type": bm_type,
                "tags": tags,
                "created": _now_utc_iso()
            }

            bookmarks.append(bookmark)
            save_json_file(BOOKMARKS, bookmarks)

            return [TextContent(type="text", text=f"Bookmark '{name}' added")]

        elif name == "bookmark_list":
            bookmarks = load_json_file(BOOKMARKS)
            tag_filter = arguments.get("tag", "").lower()
            type_filter = arguments.get("type", "").lower()
            
            if tag_filter:
                bookmarks = [b for b in bookmarks if tag_filter in [t.lower() for t in b.get("tags", [])]]
            if type_filter:
                if type_filter not in {"file", "url", "command"}:
                    return [TextContent(type="text", text="Invalid type filter. Use 'file', 'url', or 'command'.")]
                bookmarks = [b for b in bookmarks if b["type"].lower() == type_filter]
            
            if not bookmarks:
                return [TextContent(type="text", text="No bookmarks found")]
            
            output = f"Bookmarks ({len(bookmarks)}):\n" + "=" * 60 + "\n\n"
            for bm in bookmarks:
                tags = ", ".join(bm.get("tags", [])) or "no tags"
                output += f"📌 {bm['name']} [{bm['type']}]\n"
                output += f"   {bm['target']}\n"
                output += f"   Tags: {tags}\n\n"
            
            return [TextContent(type="text", text=output)]
        
        elif name == "bookmark_open":
            bookmarks = load_json_file(BOOKMARKS)
            name = arguments["name"]
            
            bookmark = next((b for b in bookmarks if b["name"].lower() == name.lower()), None)
            if not bookmark:
                return [TextContent(type="text", text=f"Bookmark '{name}' not found")]
            
            target = bookmark["target"]
            bm_type = bookmark["type"].lower()
            
            if bm_type == "file":
                subprocess.run(["explorer", target])
            elif bm_type == "url":
                subprocess.run(["start", target], shell=True)
            elif bm_type == "command":
                if not arguments.get("confirm", False):
                    return [TextContent(type="text", text="Confirmation required: set confirm=true to run command bookmark")]
                subprocess.run(target, shell=True)
            
            return [TextContent(type="text", text=f"✓ Opened bookmark: {name}")]
        
        elif name == "open_file_location":
            path = arguments["path"]
            if os.path.exists(path):
                subprocess.run(["explorer", "/select,", path])
                return [TextContent(type="text", text=f"✓ Opened location: {path}")]
            else:
                return [TextContent(type="text", text=f"Path not found: {path}")]
        
        elif name == "recent_files":
            directory = arguments.get("directory", ".")
            hours = arguments.get("hours", 24)
            extension = arguments.get("extension", "")
            
            cutoff_time = datetime.now().timestamp() - (hours * 3600)
            recent = []
            
            for root, dirs, files in os.walk(directory):
                for file in files:
                    if extension and not file.endswith(extension):
                        continue
                    
                    filepath = os.path.join(root, file)
                    try:
                        mtime = os.path.getmtime(filepath)
                        if mtime > cutoff_time:
                            recent.append({
                                "path": filepath,
                                "modified": datetime.fromtimestamp(mtime)
                            })
                    except:
                        pass
            
            recent.sort(key=lambda x: x["modified"], reverse=True)
            
            if not recent:
                return [TextContent(type="text", text=f"No files modified in last {hours} hours")]
            
            output = f"Recent Files (last {hours}h):\n" + "=" * 60 + "\n\n"
            for item in recent[:30]:
                timestamp = item["modified"].strftime("%Y-%m-%d %H:%M")
                output += f"[{timestamp}] {item['path']}\n"
            
            if len(recent) > 30:
                output += f"\n... and {len(recent) - 30} more files"
            
            return [TextContent(type="text", text=output)]
        
        elif name == "create_workspace":
            base_path = Path(arguments["path"])
            workspace_name = arguments["name"]
            folders = arguments.get("folders", "src,docs,tests").split(",")
            
            workspace_path = base_path / workspace_name
            workspace_path.mkdir(parents=True, exist_ok=True)
            
            created = []
            for folder in folders:
                folder = folder.strip()
                if folder:
                    folder_path = workspace_path / folder
                    folder_path.mkdir(exist_ok=True)
                    created.append(folder)
            
            # Create a README
            readme = workspace_path / "README.md"
            readme.write_text(f"# {workspace_name}\n\nCreated: {datetime.now().strftime('%Y-%m-%d')}\n")
            
            output = f"✓ Workspace created: {workspace_path}\n\n"
            output += "Folders created:\n"
            for folder in created:
                output += f"  - {folder}/\n"
            output += "  - README.md\n"
            
            return [TextContent(type="text", text=output)]
        
        else:
            return [TextContent(type="text", text=f"Unknown tool: {name}")]
    
    except Exception as e:
        return [TextContent(type="text", text=f"Error in {name}: {type(e).__name__} - {str(e)}")]

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
