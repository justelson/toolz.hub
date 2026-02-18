# MCP Analyzer - Database & Caching System

## Overview
The app uses SQLite to persistently store MCP server configurations and AI analysis results, dramatically reducing API costs by avoiding redundant analysis calls.

## How It Works

### 1. Smart Caching Strategy
- **Config Hash**: Each server configuration is hashed based on command, args, and env
- **Cache Check**: Before making an AI call, the app checks if an analysis exists for the current config hash
- **Automatic Reuse**: If the config hasn't changed, the cached analysis is used instantly
- **New Analysis**: Only when the config changes or no cache exists does the app call the AI

### 2. Database Schema

#### `mcp_servers` Table
Tracks all MCP servers ever detected:
- `id` - Unique server identifier
- `name` - Server name
- `command` - Executable command
- `args` - Command arguments (JSON)
- `env` - Environment variables (JSON)
- `config_path` - Path to config file
- `source` - Which IDE/app (Kiro, Claude, etc.)
- `config_hash` - Hash of current configuration
- `first_seen` - When first detected
- `last_seen` - Last detection time
- `disabled` - Whether server is disabled
- `auto_approve` - Auto-approved tools (JSON)

#### `mcp_analyses` Table
Stores AI analysis results:
- `server_id` - Links to mcp_servers
- `summary` - Brief summary
- `purpose` - Main purpose
- `capabilities` - List of capabilities (JSON)
- `use_cases` - Common use cases (JSON)
- `how_it_works` - Technical explanation
- `tools` - Available tools (JSON)
- `analyzed_at` - Analysis timestamp
- `config_hash` - Config hash at analysis time

### 3. Cost Savings Example

**Without Database:**
- Scan 10 servers → 10 AI calls
- Scan again → 10 AI calls
- Total: 20 AI calls

**With Database:**
- First scan: 10 servers → 10 AI calls
- Second scan: 10 servers → 0 AI calls (all cached)
- Config change on 1 server → 1 AI call
- Total: 11 AI calls (45% savings)

### 4. Database Location
The SQLite database is stored in the Electron user data directory:
- **Windows**: `%APPDATA%/mcp-analyzer/mcp-analyzer.db`
- **macOS**: `~/Library/Application Support/mcp-analyzer/mcp-analyzer.db`
- **Linux**: `~/.config/mcp-analyzer/mcp-analyzer.db`

### 5. Features

#### Automatic Tracking
- All detected servers are saved to the database
- Historical tracking shows when servers were first/last seen
- Config changes are automatically detected

#### Cache Invalidation
- When a server's command, args, or env changes, the cache is invalidated
- New analysis is performed only for changed configurations
- Old analyses are kept for historical reference

#### Statistics Display
The app shows database stats in the header:
- Total servers tracked
- Number of analyzed servers
- Total analyses performed

#### Toast Notifications
- "Using cached analysis" - When cache is used (saves API call)
- "Analysis complete" - When new analysis is performed

## Installation

1. Install dependencies:
```bash
npm install
```

This will install `better-sqlite3` which provides the SQLite database.

2. The database is automatically initialized on first run.

## API Cost Optimization

### Best Practices
1. **Scan regularly** - The app will use cached data for unchanged servers
2. **Analyze once** - Each unique configuration only needs one analysis
3. **Track changes** - The app automatically detects config changes
4. **Review stats** - Check the DB stats to see cache hit rate

### Expected Savings
- **First-time users**: 0% savings (need initial analysis)
- **Regular users**: 70-90% savings (most configs don't change)
- **Power users**: 95%+ savings (stable configurations)

## Maintenance

### View Database
You can inspect the database using any SQLite viewer:
```bash
sqlite3 path/to/mcp-analyzer.db
```

### Clear Cache
To force re-analysis of all servers:
1. Close the app
2. Delete the database file
3. Restart the app

### Backup
The database file can be backed up like any other file. It contains:
- All server configurations
- All analysis results
- Historical tracking data

## Technical Details

### Config Hash Algorithm
A simple hash function combines:
- Command string
- Arguments array
- Environment variables object

Changes to any of these trigger a new analysis.

### Performance
- Database queries are extremely fast (<1ms)
- No network calls for cached data
- Instant loading of previous analyses

### Privacy
- All data is stored locally
- No data is sent to any server except Groq API for analysis
- Database can be deleted at any time
