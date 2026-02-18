#!/usr/bin/env python3
"""
Notification MCP Server
Simple MCP tools for sending local system notifications.
"""

import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import Any

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool

server = Server("notification-mcp")

APP_NAME = "MCP Notification"
DATA_DIR = Path.home() / ".notification-mcp"
LOG_FILE = DATA_DIR / "events.jsonl"
DATA_DIR.mkdir(exist_ok=True)


def log_event(tool_name: str, payload: dict[str, Any], success: bool, details: str) -> None:
    """Append tool events for simple troubleshooting."""
    entry = {
        "timestamp": datetime.now().isoformat(),
        "tool": tool_name,
        "success": success,
        "details": details,
        "payload": payload,
    }
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def send_system_notification(title: str, message: str, timeout_seconds: int = 6) -> tuple[bool, str]:
    """
    Send a local OS notification.
    Tries plyer first, then win10toast on Windows.
    """
    try:
        from plyer import notification as plyer_notification

        plyer_notification.notify(
            title=title,
            message=message,
            app_name=APP_NAME,
            timeout=max(1, int(timeout_seconds)),
        )
        return True, "sent using plyer"
    except Exception as plyer_error:
        try:
            from win10toast import ToastNotifier

            toaster = ToastNotifier()
            toaster.show_toast(
                title=title,
                msg=message,
                duration=max(1, int(timeout_seconds)),
                threaded=True,
            )
            return True, "sent using win10toast"
        except Exception as win_error:
            return (
                False,
                "notification failed (plyer error: "
                + str(plyer_error)
                + ", win10toast error: "
                + str(win_error)
                + ")",
            )


@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="notify_done",
            description=(
                "Send a completion notification. Use this when an AI finishes a task "
                "and wants to alert the user."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "task": {
                        "type": "string",
                        "description": "Short task name. Example: 'Data sync'",
                    },
                    "details": {
                        "type": "string",
                        "description": "Optional details shown in the notification body.",
                    },
                },
            },
        ),
        Tool(
            name="notify_need_input",
            description=(
                "Send a notification asking the user for input or approval. "
                "Use this when an AI is blocked and needs a user decision."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "question": {
                        "type": "string",
                        "description": "What the AI needs from the user.",
                    },
                    "context": {
                        "type": "string",
                        "description": "Optional short context for the request.",
                    },
                },
                "required": ["question"],
            },
        ),
        Tool(
            name="notify_custom",
            description=(
                "Send any custom notification title/message. "
                "Use for status updates, warnings, or reminders."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Notification title.",
                    },
                    "message": {
                        "type": "string",
                        "description": "Notification body text.",
                    },
                    "timeout_seconds": {
                        "type": "number",
                        "description": "Visible duration in seconds (default: 6).",
                    },
                },
                "required": ["title", "message"],
            },
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    args = arguments or {}

    try:
        if name == "notify_done":
            task = args.get("task", "Task")
            details = args.get("details", "Completed successfully.")
            title = f"Done: {task}"
            message = details
            ok, info = send_system_notification(title=title, message=message, timeout_seconds=6)
            log_event(name, args, ok, info)
            if ok:
                return [TextContent(type="text", text=f"Notification sent. {info}")]
            return [TextContent(type="text", text=f"Notification failed. {info}")]

        if name == "notify_need_input":
            question = args["question"]
            context = args.get("context", "AI needs your response to continue.")
            title = "Action Needed"
            message = f"{question}\n{context}"
            ok, info = send_system_notification(title=title, message=message, timeout_seconds=10)
            log_event(name, args, ok, info)
            if ok:
                return [TextContent(type="text", text=f"Notification sent. {info}")]
            return [TextContent(type="text", text=f"Notification failed. {info}")]

        if name == "notify_custom":
            title = args["title"]
            message = args["message"]
            timeout_seconds = int(args.get("timeout_seconds", 6))
            ok, info = send_system_notification(
                title=title,
                message=message,
                timeout_seconds=timeout_seconds,
            )
            log_event(name, args, ok, info)
            if ok:
                return [TextContent(type="text", text=f"Notification sent. {info}")]
            return [TextContent(type="text", text=f"Notification failed. {info}")]

        return [TextContent(type="text", text=f"Unknown tool: {name}")]
    except KeyError as e:
        error_message = f"Missing required argument: {str(e)}"
        log_event(name, args, False, error_message)
        return [TextContent(type="text", text=error_message)]
    except Exception as e:
        error_message = f"Error executing {name}: {str(e)}"
        log_event(name, args, False, error_message)
        return [TextContent(type="text", text=error_message)]


async def main() -> None:
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


if __name__ == "__main__":
    asyncio.run(main())
