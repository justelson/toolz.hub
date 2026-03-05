# Notion MCP Setup (toolz/notion-mcp)

This folder contains a local launcher for the official Notion MCP server package.

## What this setup does

- Keeps your Notion token in a local `.env` file (not committed)
- Launches `@notionhq/notion-mcp-server` over stdio
- Works with MCP clients that support command-based servers

## 1) Create Notion integration token

1. Open: https://www.notion.so/profile/integrations
2. Create/select an internal integration
3. Copy the integration token (`ntn_...`)
4. Share the pages/databases you want the integration to access

## 2) Add local env

In this folder:

1. Copy `.env.example` to `.env`
2. Set your real token:

```env
NOTION_TOKEN=ntn_your_real_token
```

## 3) Test locally

```powershell
cd C:\Users\elson\my_coding_play\toolz\notion-mcp
python .\server.py --transport stdio
```

## 4) Add to your MCP config

Use the content in `mcp.example.json` (or merge it into your current MCP config):

```json
{
  "mcpServers": {
    "notionApi": {
      "command": "python",
      "args": [
        "C:\\Users\\elson\\my_coding_play\\toolz\\notion-mcp\\server.py"
      ]
    }
  }
}
```

## Notes

- No credentials are stored in repo files.
- If `python` command differs on your system, switch to `py` in MCP config.
- Requires Node.js/npm because launcher uses `npx` to run the official package.
