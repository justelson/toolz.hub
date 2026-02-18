#!/usr/bin/env python3
"""Launcher wrapper for Spotify MCP in toolz.

Loads .env from this folder, then delegates to spotify-mcp-server via uvx,
keeping stdio intact so MCP clients can communicate normally.
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path


def _load_local_env(base_dir: Path) -> None:
    env_path = base_dir / '.env'
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding='utf-8').splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue

        key, value = line.split('=', 1)
        key = key.strip().lstrip('\ufeff')
        value = value.strip().strip('"').strip("'")

        if key and (key not in os.environ or not os.environ.get(key)):
            os.environ[key] = value


def main() -> int:
    base_dir = Path(__file__).resolve().parent
    _load_local_env(base_dir)

    uvx = shutil.which('uvx')
    if not uvx:
        sys.stderr.write('uvx was not found on PATH. Install uv first.\n')
        return 1

    cmd = [uvx, 'spotify-mcp-server', *sys.argv[1:]]
    completed = subprocess.run(cmd, env=os.environ)
    return int(completed.returncode)


if __name__ == '__main__':
    raise SystemExit(main())
