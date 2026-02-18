# 🛠️ toolz.hub

A personal collection of MCP (Model Context Protocol) servers and utilities built to supercharge AI-assisted workflows on Windows.

---

## 📦 Tools

### 🎵 [spotify-mcp](./spotify-mcp)
Control Spotify directly from your AI agent. Play, pause, search tracks, manage playlists, and more — all through natural language.
- **Config:** Copy `mcp.example.json` → `mcp.json` and add your Spotify API credentials
- **Setup:** Get credentials at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

---

### 🖥️ [system-commander](./system-commander)
PC management and automation via MCP. Run shell commands, monitor system resources, manage processes, search files, and inspect network info.
- **Tools:** `execute_command`, `get_system_info`, `list_processes`, `kill_process`, `search_files`, `get_network_info`
- **Safety:** Dangerous commands and long-running servers are automatically blocked

---

### 📋 [clipboard-tracker](./clipboard-tracker)
System-wide clipboard monitoring with full context tracking. Records what you copied, from which app, and from which window — all stored locally in SQLite.
- **Tools:** `get_clipboard_history`, `search_clipboard`, `get_clipboard_stats`, `clear_clipboard_history`
- **Privacy:** All data stored locally, no network access

---

### 🔔 [notification-mcp](./notification-mcp)
Let your AI agent send native Windows desktop notifications. Useful for long-running tasks — get notified when work is done or when the AI needs your input.
- **Tools:** `notify_done`, `notify_need_input`, `notify_custom`

---

### ⚙️ [workflow-assistant](./workflow-assistant)
Productivity tools for AI-assisted PC usage. Manage clipboard, save quick notes, bookmark files/URLs/commands, and perform file operations.
- **Tools:** `clipboard_read/write/history`, `quick_note`, `list_notes`, `bookmark_add/list/open`, `open_file_location`, `recent_files`, `create_workspace`

---

### 🚀 [app-launcher](./app-launcher)
Launch and manage applications on your PC through your AI agent.

---

### 🔁 [node-runner](./node-runner)
Run Node.js scripts and commands via MCP without leaving your AI conversation.

---

### 🧩 [mcp-analyzer](./mcp-analyzer)
An Electron desktop app for discovering, analyzing, and documenting all MCP servers configured on your machine. Features AI-powered analysis, export options, and a visual dashboard.
- **Stack:** Electron + React + TypeScript + Tailwind CSS + SQLite

---

## 🚀 Quick Setup

Each tool is a standalone MCP server. To use any tool:

1. **Install dependencies:**
   ```bash
   cd <tool-folder>
   pip install -r requirements.txt
   ```

2. **Add to your MCP config** (e.g. `.kiro/settings/mcp.json` or Cursor MCP settings):
   ```json
   {
     "mcpServers": {
       "tool-name": {
         "command": "python",
         "args": ["C:/path/to/toolz/<tool-folder>/server.py"]
       }
     }
   }
   ```

3. **Restart your AI client** to pick up the new server.

> Each tool folder contains its own `README.md` with detailed setup instructions and usage examples.

---

## 🔧 Requirements

- Python 3.8+
- Windows (most tools use Win32 APIs)
- [`mcp`](https://pypi.org/project/mcp/) Python library

---

## 📄 License

MIT — see [LICENSE](./LICENSE)
