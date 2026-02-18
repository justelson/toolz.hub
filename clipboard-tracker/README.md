# Clipboard Tracker MCP Server

System-wide clipboard monitoring with context tracking.

## Features

### 🎯 What It Tracks

**Every time you copy something, it records:**
- ✅ The copied content
- ✅ Timestamp (exact time)
- ✅ App name (e.g., "chrome.exe", "notepad.exe")
- ✅ Window title (e.g., "Document1 - Word")
- ✅ Process path
- ✅ Browser tab title (if copying from browser)
- ✅ Content type (text, URL, multiline)
- ✅ Content length

### 🔍 Example Data

```json
{
  "content": "Hello World",
  "timestamp": "2024-02-02 10:30:45",
  "app": "chrome.exe",
  "window": "GitHub - Google Chrome",
  "browser_tab": "GitHub",
  "type": "text",
  "length": 11
}
```

## Installation

```bash
cd clipboard-tracker
pip install -r requirements.txt
```

## Usage

### Start the Server

```bash
python server.py
```

The server will:
1. Start monitoring clipboard in background
2. Track every copy operation
3. Store data in SQLite database
4. Provide MCP tools for Julia to query

### Database Location

`~/.julia/clipboard_tracker.db`

## MCP Tools

### 1. `get_clipboard_history`
Get clipboard history with context

**Parameters:**
- `limit` (number): Number of items (default: 10)
- `app_filter` (string): Filter by app name
- `content_type` (string): Filter by type (text, url, multiline)

**Example:**
```json
{
  "limit": 5,
  "app_filter": "chrome"
}
```

### 2. `search_clipboard`
Search clipboard history by content

**Parameters:**
- `query` (string): Search query
- `limit` (number): Number of results (default: 10)

**Example:**
```json
{
  "query": "password",
  "limit": 5
}
```

### 3. `get_clipboard_stats`
Get statistics about clipboard usage

**Returns:**
- Total entries
- Most used apps
- Content type breakdown

### 4. `clear_clipboard_history`
Clear all clipboard history

**Parameters:**
- `confirm` (boolean): Must be true to confirm

## How It Works

### Background Monitoring

The server runs a background task that:
1. Checks clipboard every 500ms
2. Detects when content changes
3. Gets active window info using Win32 API
4. Extracts browser tab if applicable
5. Saves to SQLite database

### Window Detection

Uses Windows API to get:
- Active window handle
- Window title
- Process ID and name
- Executable path

### Browser Detection

Detects these browsers:
- Chrome
- Firefox
- Edge
- Brave
- Opera

Extracts tab title from window title.

## Julia Integration

Julia can ask:
- "What did I copy from Chrome?"
- "Show me clipboard history from the last hour"
- "What was that URL I copied earlier?"
- "Show me everything I copied from VS Code"
- "Search my clipboard for 'password'"

## Privacy

- All data stored locally in SQLite
- No network access
- No cloud sync
- User can clear history anytime

## Performance

- Lightweight: ~5MB RAM
- Fast: 500ms polling interval
- Efficient: Only saves when clipboard changes
- Smart: Deduplicates consecutive copies

## Limitations

- Windows only (uses Win32 API)
- Browser URL extraction limited to window title
- Can't detect paste location (only copy source)
- Content limited to 5000 characters per entry

## Future Enhancements

- [ ] Detect paste location (requires global keyboard hook)
- [ ] Extract actual browser URL (requires browser extension)
- [ ] Image clipboard support
- [ ] File path clipboard support
- [ ] Clipboard sync across devices
- [ ] Encryption for sensitive data
- [ ] Auto-categorization (code, text, URLs, etc.)
- [ ] Clipboard search with fuzzy matching

## Troubleshooting

### Server won't start
- Check Python version (3.8+)
- Install dependencies: `pip install -r requirements.txt`
- Run as administrator if permission errors

### Not tracking clipboard
- Check if pyperclip works: `python -c "import pyperclip; print(pyperclip.paste())"`
- Restart the server
- Check database permissions

### Wrong app detected
- Some apps use child processes
- Window title may not reflect actual app
- Browser detection is best-effort

## Security Notes

⚠️ **Sensitive Data Warning**

This tool tracks ALL clipboard content, including:
- Passwords
- API keys
- Personal information
- Credit card numbers

**Recommendations:**
1. Clear history regularly
2. Don't share database file
3. Use encryption for sensitive data
4. Exclude password managers from tracking

## License

MIT License - Use at your own risk
