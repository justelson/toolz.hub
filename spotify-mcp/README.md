# Spotify MCP Setup (toolz/spotify-mcp)

This folder stores a ready Spotify MCP configuration template.

## Redirect URL

Use this exact redirect URL in Spotify Developer Dashboard:

`http://127.0.0.1:8888/callback`

## MCP server config example

```json
{
  "mcpServers": {
    "spotify": {
      "command": "uvx",
      "args": ["spotify-mcp-server"],
      "env": {
        "SPOTIFY_CLIENT_ID": "YOUR_CLIENT_ID",
        "SPOTIFY_CLIENT_SECRET": "YOUR_CLIENT_SECRET",
        "SPOTIFY_REDIRECT_URI": "http://127.0.0.1:8888/callback"
      }
    }
  }
}
```

If `uvx` is unavailable, install `uv` first or switch to another launcher you use for Python MCP servers.
