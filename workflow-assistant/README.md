# Workflow Assistant MCP Server

Productivity tools designed for AI-assisted PC usage. Makes your daily workflow smoother with clipboard management, quick notes, bookmarks, and file operations.

## Features

### 📋 Clipboard Management
- **clipboard_read** - Read current clipboard content
- **clipboard_write** - Write text to clipboard
- **clipboard_history** - View last 20 clipboard items

### 📝 Quick Notes
- **quick_note** - Save quick notes with optional tags
- **list_notes** - List all notes, filter by tag
- **delete_note** - Delete a note by ID

### 🔖 Bookmarks
- **bookmark_add** - Bookmark files, URLs, or commands
- **bookmark_list** - List bookmarks, filter by tag/type
- **bookmark_open** - Open a bookmark instantly

### 📁 File Operations
- **open_file_location** - Open file/folder in Explorer
- **recent_files** - Find recently modified files
- **create_workspace** - Create project workspace with folders

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Add to your Kiro MCP config at `.kiro/settings/mcp.json`:
```json
{
  "mcpServers": {
    "workflow-assistant": {
      "command": "python",
      "args": ["C:/path/to/workflow-assistant/server.py"]
    }
  }
}
```

3. Restart Kiro or reconnect the MCP server

## Usage Examples

### Clipboard
- "What's in my clipboard?"
- "Copy this text to clipboard: [text]"
- "Show me my clipboard history"

### Notes
- "Save a quick note: Remember to call John tomorrow"
- "Add a note tagged 'work': Review PR #123"
- "Show me all notes tagged 'work'"
- "Delete note 20260202120000"

### Bookmarks
- "Bookmark this file: C:\\Projects\\myapp\\config.json as 'app config'"
- "Add a URL bookmark: https://github.com/myrepo as 'my repo'"
- "List all my bookmarks"
- "Open bookmark 'app config'"

### Files
- "Show me files modified in the last 6 hours in C:\\Projects"
- "Open the location of C:\\Users\\me\\document.pdf"
- "Create a workspace called 'new-project' in C:\\Projects with folders: src,tests,docs,assets"

## Data Storage

All data is stored in `~/.workflow-assistant/`:
- `clipboard_history.json` - Last 20 clipboard items
- `quick_notes.json` - All your quick notes
- `bookmarks.json` - All your bookmarks

## Why This MCP?

When working with an AI agent, you need quick access to:
- Clipboard for copying/pasting between contexts
- Notes for tracking TODOs and ideas during sessions
- Bookmarks for frequently accessed files/URLs
- File operations without leaving the conversation

This MCP makes all of that seamless.
