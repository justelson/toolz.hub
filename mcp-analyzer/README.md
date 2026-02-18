# MCP Analyzer

A powerful desktop application for detecting, analyzing, and managing Model Context Protocol (MCP) servers across multiple IDEs and tools.

![MCP Analyzer](https://img.shields.io/badge/Electron-v28-blue) ![React](https://img.shields.io/badge/React-v18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-v5-blue)

## Features

### 🔍 Multi-IDE Detection
Automatically detects MCP servers from:
- **Kiro** - User and workspace configs
- **Claude Desktop** - Desktop app configs
- **Cline** - VS Code extension
- **Cursor** - VS Code fork
- **Windsurf** - Codeium IDE
- **Continue.dev** - VS Code extension
- **Zed** - Modern code editor
- **Roo Code/Cline** - VS Code extensions
- **Antigravity** - Google's IDE
- **Gemini CLI** - Google's CLI tool
- **Codex CLI** - OpenAI's CLI tool

### 🤖 AI-Powered Analysis
- Uses **Groq API** (Llama 3.3 70B) for intelligent MCP server analysis
- Generates comprehensive reports including:
  - Summary and purpose
  - Key capabilities
  - Common use cases
  - Technical implementation details

### 💾 Smart Caching
- **SQLite database** for persistent storage
- Caches analysis results to reduce API costs by 70-90%
- Automatic duplicate detection and cleanup
- Config hash tracking to detect changes

### 🎨 Modern UI
- **Brutalist design** with orange primary color
- **Dark/Light mode** toggle
- **Resizable panels** (source filter and detail view)
- **Grid/Table view** toggle
- Real-time status indicators
- Performance metrics display

### 📊 Advanced Features
- **Source filtering** - View servers by IDE/tool
- **Export functionality** - JSON, Markdown, or both
- **Keyboard shortcuts** - Ctrl+R (scan), Ctrl+E (export), F5 (refresh)
- **Process detection** - Identifies running MCP servers
- **Empty state handling** - Shows placeholders for IDEs with no servers
- **Load from cache** - Instant restore of last scan

## Installation

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+ (for uvx-based MCP servers)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd mcp-analyzer

# Install dependencies
npm install

# Rebuild native modules for Electron
npm run rebuild

# Start development server
npm run dev
```

### Build for Production

```bash
# Build for current platform
npm run build

# Package the application
npm run package
```

## Configuration

### Groq API Key
1. Get your API key from [Groq Console](https://console.groq.com)
2. Open Settings in the app
3. Enter your API key
4. Click "Test Connection" to verify
5. Save

The API key is stored securely in localStorage and persists across sessions.

## Usage

### Scanning for MCP Servers

1. Click **"Scan for MCP Servers"** or press `Ctrl+R`
2. The app scans all configured IDE locations
3. Detected servers appear in the main view
4. Running servers are highlighted in green

### Analyzing a Server

1. Click on any server card
2. Click **"Analyze Server"** button
3. AI generates a comprehensive analysis
4. Results are cached for future use

### Filtering by Source

1. Use the left sidebar to filter by IDE/tool
2. Click on a source to view only its servers
3. Click "All Sources" to view everything

### Exporting Data

1. Click the **Export** button or press `Ctrl+E`
2. Choose format: JSON, Markdown, or Both
3. Select save location
4. Data is exported with all analyses

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript
- **Desktop**: Electron 28
- **Build**: Vite 5
- **Styling**: Tailwind CSS
- **Database**: better-sqlite3
- **AI**: Groq SDK (Llama 3.3 70B)

### Project Structure

```
mcp-analyzer/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # Main entry point
│   │   ├── mcp-scanner.ts # MCP detection logic
│   │   ├── ai-analyzer.ts # Groq AI integration
│   │   ├── database.ts    # SQLite operations
│   │   └── exporter.ts    # Export functionality
│   ├── renderer/          # React frontend
│   │   ├── App.tsx        # Main app component
│   │   ├── components/    # UI components
│   │   └── styles.css     # Global styles
│   ├── preload/           # Electron preload scripts
│   └── shared/            # Shared types
├── dist/                  # Build output
└── package.json
```

## Database Schema

### `mcp_servers` Table
- `id` - Unique server identifier
- `name` - Server name
- `command` - Execution command
- `args` - Command arguments (JSON)
- `env` - Environment variables (JSON)
- `config_path` - Path to config file
- `source` - IDE/tool name
- `config_hash` - Hash for change detection
- `first_seen` - First detection timestamp
- `last_seen` - Last detection timestamp
- `disabled` - Disabled flag
- `auto_approve` - Auto-approve list (JSON)

### `mcp_analyses` Table
- `server_id` - Foreign key to servers
- `summary` - Brief summary
- `purpose` - Main purpose
- `capabilities` - List of capabilities (JSON)
- `use_cases` - Common use cases (JSON)
- `how_it_works` - Technical explanation
- `tools` - Available tools (JSON)
- `analyzed_at` - Analysis timestamp
- `config_hash` - Config hash at analysis time

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+R` | Scan for MCP servers |
| `Ctrl+E` | Export data |
| `F5` | Refresh/Rescan |

## Troubleshooting

### Native Module Errors

If you see `NODE_MODULE_VERSION` errors:

```bash
npm run rebuild
```

### Database Issues

To clean up duplicates and orphaned data:

```bash
# The app automatically cleans on startup
# Or manually run:
node cleanup-db.cjs
```

### Theme Not Changing

1. Hard refresh: `Ctrl+Shift+R`
2. Restart the dev server
3. Clear browser cache

### MCP Servers Not Detected

1. Verify config file locations exist
2. Check console logs for errors
3. Ensure JSON/TOML files are valid
4. Run test scan: `node check-configs.cjs`

## Development

### Adding New IDE Support

1. Add config path to `MCP_CONFIG_LOCATIONS` in `mcp-scanner.ts`
2. Add source name mapping in `getSourceName()`
3. Handle config format in parsing logic
4. Test detection with actual config file

### Modifying Analysis Prompt

Edit the prompt in `src/main/ai-analyzer.ts`:

```typescript
const prompt = `Your custom prompt here...`;
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Credits

- Built with [Electron](https://www.electronjs.org/)
- AI powered by [Groq](https://groq.com/)
- Icons from [Lucide](https://lucide.dev/)
- Fonts: Inter, JetBrains Mono, Source Serif 4

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review console logs for errors

---

**Made with ❤️ for the MCP community**
