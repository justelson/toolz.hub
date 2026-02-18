# Notification MCP Server

Simple MCP server that lets AI agents send local system notifications.

## Tools

- `notify_done`: send a completion notification (for finished work)
- `notify_need_input`: send an "action needed" notification (for user decisions)
- `notify_custom`: send any custom notification

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Add to MCP config (example for Kiro at `.kiro/settings/mcp.json`):
```json
{
  "mcpServers": {
    "notification-mcp": {
      "command": "python",
      "args": ["C:/Users/elson/my_coding_play/toolz/notification-mcp/server.py"]
    }
  }
}
```

3. Restart your MCP client (or reconnect server).

## Example tool calls

### Task finished
```json
{
  "tool": "notify_done",
  "arguments": {
    "task": "Build complete",
    "details": "All tests passed."
  }
}
```

### AI needs input
```json
{
  "tool": "notify_need_input",
  "arguments": {
    "question": "Can I deploy to production now?",
    "context": "Staging health checks are green."
  }
}
```

### Custom
```json
{
  "tool": "notify_custom",
  "arguments": {
    "title": "Reminder",
    "message": "Please review PR #42",
    "timeout_seconds": 8
  }
}
```

## Notes

- Notifications are local to the machine where this server runs.
- Event logs are stored at `~/.notification-mcp/events.jsonl`.
- If notifications fail, check that dependencies installed correctly and Windows notifications are enabled.
