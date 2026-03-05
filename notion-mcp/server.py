#!/usr/bin/env python3
"""Local launcher for Notion MCP.

Loads .env from this folder, then delegates to the official Notion MCP server
package. Prefers a locally installed CLI for fast startup, with npx fallback.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path


def _load_local_env(base_dir: Path) -> None:
    env_path = base_dir / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip().lstrip("\ufeff")
        value = value.strip().strip('"').strip("'")

        if key and (key not in os.environ or not os.environ.get(key)):
            os.environ[key] = value


def main() -> int:
    base_dir = Path(__file__).resolve().parent
    _load_local_env(base_dir)

    if not os.environ.get("NOTION_TOKEN") and not os.environ.get("OPENAPI_MCP_HEADERS"):
        sys.stderr.write(
            "Missing Notion auth. Set NOTION_TOKEN in notion-mcp/.env or pass OPENAPI_MCP_HEADERS.\n"
        )
        return 1

    local_cli = base_dir / "node_modules" / "@notionhq" / "notion-mcp-server" / "bin" / "cli.mjs"
    node = shutil.which("node")
    npx = shutil.which("npx")

    if local_cli.exists():
        if not node:
            sys.stderr.write("node was not found on PATH. Install Node.js first.\n")
            return 1
        cmd = [node, str(local_cli), *sys.argv[1:]]
    else:
        if not npx:
            sys.stderr.write("npx was not found on PATH. Install Node.js/npm first.\n")
            return 1
        cmd = [npx, "-y", "@notionhq/notion-mcp-server", *sys.argv[1:]]

    completed = subprocess.run(cmd, env=os.environ)
    return int(completed.returncode)


if __name__ == "__main__":
    raise SystemExit(main())
