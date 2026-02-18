#!/usr/bin/env python3
"""
App Launcher MCP Server
Lists installed apps and launches them on Windows.
"""

import asyncio
import json
import os
import sys
import time
import subprocess
from pathlib import Path
from datetime import datetime, timezone

try:
    import winreg  # type: ignore
except Exception:
    winreg = None

from mcp.server import Server
from mcp.types import Tool, TextContent
from mcp.server.stdio import stdio_server

server = Server("app-launcher")

CACHE_TTL_SECONDS = 300
_APP_CACHE = {
    "timestamp": 0.0,
    "apps": []
}

def _now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def _normalize_name(name: str) -> str:
    return name.strip().casefold()

def _reg_get(key, value_name: str):
    try:
        value, _ = winreg.QueryValueEx(key, value_name)
        return value
    except Exception:
        return None

def _parse_display_icon(display_icon: str | None) -> str | None:
    if not display_icon:
        return None
    raw = str(display_icon).strip().strip('"')
    if "," in raw:
        raw = raw.split(",", 1)[0].strip().strip('"')
    raw = os.path.expandvars(raw)
    if raw.lower().endswith(".exe") and os.path.exists(raw):
        return raw
    return None

def _get_registry_apps() -> list[dict]:
    if winreg is None or sys.platform != "win32":
        return []

    apps = []
    uninstall_keys = [
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
        (winreg.HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
    ]

    for root, path in uninstall_keys:
        try:
            with winreg.OpenKey(root, path) as key:
                subkey_count = winreg.QueryInfoKey(key)[0]
                for i in range(subkey_count):
                    try:
                        subkey_name = winreg.EnumKey(key, i)
                        with winreg.OpenKey(key, subkey_name) as subkey:
                            name = _reg_get(subkey, "DisplayName")
                            if not name:
                                continue
                            app = {
                                "name": str(name).strip(),
                                "version": _reg_get(subkey, "DisplayVersion"),
                                "publisher": _reg_get(subkey, "Publisher"),
                                "install_location": _reg_get(subkey, "InstallLocation"),
                                "exe_path": _parse_display_icon(_reg_get(subkey, "DisplayIcon")),
                                "app_id": None,
                                "sources": ["registry"]
                            }
                            apps.append(app)
                    except Exception:
                        continue
        except Exception:
            continue

    return apps

def _get_start_apps() -> list[dict]:
    if sys.platform != "win32":
        return []

    cmd = [
        "powershell",
        "-NoProfile",
        "-Command",
        "Get-StartApps | Select-Object Name,AppID | ConvertTo-Json -Depth 3"
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return []

    raw = result.stdout.strip()
    if not raw:
        return []

    try:
        data = json.loads(raw)
    except Exception:
        return []

    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list):
        return []

    apps = []
    for item in data:
        name = item.get("Name")
        app_id = item.get("AppID")
        if not name or not app_id:
            continue
        apps.append({
            "name": str(name).strip(),
            "app_id": str(app_id).strip(),
            "exe_path": None,
            "version": None,
            "publisher": None,
            "install_location": None,
            "sources": ["startapps"]
        })
    return apps

def _merge_apps(primary: dict, incoming: dict) -> dict:
    merged = dict(primary)
    for field in ["app_id", "exe_path", "version", "publisher", "install_location"]:
        if not merged.get(field) and incoming.get(field):
            merged[field] = incoming[field]
    merged_sources = set(merged.get("sources", []))
    merged_sources.update(incoming.get("sources", []))
    merged["sources"] = sorted(merged_sources)
    return merged

def _get_all_apps(refresh: bool = False) -> list[dict]:
    now = time.time()
    if not refresh and _APP_CACHE["apps"] and (now - _APP_CACHE["timestamp"] < CACHE_TTL_SECONDS):
        return _APP_CACHE["apps"]

    apps = []
    apps.extend(_get_start_apps())
    apps.extend(_get_registry_apps())

    deduped = {}
    for app in apps:
        key = _normalize_name(app["name"])
        if key in deduped:
            deduped[key] = _merge_apps(deduped[key], app)
        else:
            deduped[key] = app

    result = sorted(deduped.values(), key=lambda a: a["name"].lower())
    _APP_CACHE["apps"] = result
    _APP_CACHE["timestamp"] = now
    return result

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="list_installed_apps",
            description="List installed apps (Windows).",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Optional search filter (name contains)."
                    },
                    "limit": {
                        "type": "number",
                        "description": "Max number of results (default 200)."
                    },
                    "include_registry": {
                        "type": "boolean",
                        "description": "Include registry-installed apps (default true)."
                    },
                    "include_start_apps": {
                        "type": "boolean",
                        "description": "Include Start Menu apps (default true)."
                    },
                    "refresh": {
                        "type": "boolean",
                        "description": "Force refresh of cached app list."
                    }
                }
            }
        ),
        Tool(
            name="launch_app",
            description="Launch an installed app by name or AppID.",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "App name to launch."
                    },
                    "app_id": {
                        "type": "string",
                        "description": "Start Menu AppID (preferred when known)."
                    },
                    "exact": {
                        "type": "boolean",
                        "description": "Only match exact name (default false)."
                    },
                    "refresh": {
                        "type": "boolean",
                        "description": "Force refresh of cached app list."
                    }
                }
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if sys.platform != "win32":
        return [TextContent(type="text", text=json.dumps({
            "success": False,
            "error": "This tool is only supported on Windows."
        }))]

    if name == "list_installed_apps":
        query = (arguments.get("query") or "").strip().casefold()
        limit = int(arguments.get("limit") or 200)
        include_registry = arguments.get("include_registry", True)
        include_start = arguments.get("include_start_apps", True)
        refresh = bool(arguments.get("refresh", False))

        apps = _get_all_apps(refresh=refresh)
        filtered = []
        for app in apps:
            sources = app.get("sources", [])
            allowed = False
            if include_registry and "registry" in sources:
                allowed = True
            if include_start and "startapps" in sources:
                allowed = True
            if not allowed:
                continue
            if query and query not in app["name"].casefold():
                continue
            filtered.append(app)

        filtered = filtered[:max(1, limit)]
        return [TextContent(type="text", text=json.dumps({
            "success": True,
            "count": len(filtered),
            "generated_at": _now_utc_iso(),
            "apps": filtered
        }))]

    if name == "launch_app":
        app_id = (arguments.get("app_id") or "").strip()
        name_value = (arguments.get("name") or "").strip()
        exact = bool(arguments.get("exact", False))
        refresh = bool(arguments.get("refresh", False))

        if not app_id and not name_value:
            return [TextContent(type="text", text=json.dumps({
                "success": False,
                "error": "Provide name or app_id."
            }))]

        if app_id:
            try:
                subprocess.Popen(["explorer.exe", f"shell:AppsFolder\\{app_id}"])
                return [TextContent(type="text", text=json.dumps({
                    "success": True,
                    "launched": {"app_id": app_id, "method": "startapps"}
                }))]
            except Exception as e:
                return [TextContent(type="text", text=json.dumps({
                    "success": False,
                    "error": f"Failed to launch AppID: {str(e)}"
                }))]

        apps = _get_all_apps(refresh=refresh)
        name_key = _normalize_name(name_value)

        if exact:
            matches = [a for a in apps if _normalize_name(a["name"]) == name_key]
        else:
            matches = [a for a in apps if name_key in _normalize_name(a["name"])]

        if not matches:
            return [TextContent(type="text", text=json.dumps({
                "success": False,
                "error": f"No apps found matching '{name_value}'."
            }))]

        if len(matches) > 1:
            options = [
                {"name": m["name"], "app_id": m.get("app_id"), "exe_path": m.get("exe_path")}
                for m in matches[:10]
            ]
            return [TextContent(type="text", text=json.dumps({
                "success": False,
                "error": "Multiple matches found. Use a more specific name or app_id.",
                "matches": options
            }))]

        match = matches[0]
        if match.get("app_id"):
            try:
                subprocess.Popen(["explorer.exe", f"shell:AppsFolder\\{match['app_id']}"])
                return [TextContent(type="text", text=json.dumps({
                    "success": True,
                    "launched": {"name": match["name"], "method": "startapps", "app_id": match["app_id"]}
                }))]
            except Exception as e:
                return [TextContent(type="text", text=json.dumps({
                    "success": False,
                    "error": f"Failed to launch AppID: {str(e)}"
                }))]

        exe_path = match.get("exe_path")
        if exe_path and os.path.exists(exe_path):
            try:
                subprocess.Popen([exe_path], cwd=str(Path(exe_path).parent))
                return [TextContent(type="text", text=json.dumps({
                    "success": True,
                    "launched": {"name": match["name"], "method": "exe", "exe_path": exe_path}
                }))]
            except Exception as e:
                return [TextContent(type="text", text=json.dumps({
                    "success": False,
                    "error": f"Failed to launch exe: {str(e)}"
                }))]

        return [TextContent(type="text", text=json.dumps({
            "success": False,
            "error": "No launch method available for this app. Try using app_id from list_installed_apps."
        }))]

    return [TextContent(type="text", text=json.dumps({
        "success": False,
        "error": f"Unknown tool: {name}"
    }))]

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())
