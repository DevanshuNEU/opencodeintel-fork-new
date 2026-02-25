"""Tool handler dispatch.

Maps tool names to their API calls and response formatters.
Each handler follows the same pattern: call API, format response.
Error handling is centralized in call_tool() so individual handlers stay clean.
"""
from typing import Any

import httpx
import mcp.types as types

from api_client import api_get, api_post
from formatters import (
    format_codebase_dna,
    format_code_style,
    format_dependency_graph,
    format_impact_analysis,
    format_repositories,
    format_repository_insights,
    format_search_results,
)


async def _handle_search(args: dict[str, Any]) -> str:
    result = await api_post("/search", json=args)
    return format_search_results(result)


async def _handle_list_repositories(args: dict[str, Any]) -> str:
    result = await api_get("/repos")
    return format_repositories(result)


async def _handle_dependency_graph(args: dict[str, Any]) -> str:
    result = await api_get(f"/repos/{args['repo_id']}/dependencies")
    return format_dependency_graph(result)


async def _handle_code_style(args: dict[str, Any]) -> str:
    result = await api_get(f"/repos/{args['repo_id']}/style-analysis")
    return format_code_style(result)


async def _handle_impact(args: dict[str, Any]) -> str:
    result = await api_post(
        f"/repos/{args['repo_id']}/impact",
        json={"repo_id": args["repo_id"], "file_path": args["file_path"]},
    )
    return format_impact_analysis(result)


async def _handle_insights(args: dict[str, Any]) -> str:
    result = await api_get(f"/repos/{args['repo_id']}/insights")
    return format_repository_insights(result)


async def _handle_dna(args: dict[str, Any]) -> str:
    result = await api_get(f"/repos/{args['repo_id']}/dna?format=markdown")
    return format_codebase_dna(result)


# Tool name -> handler mapping
_HANDLERS: dict[str, Any] = {
    "search_code": _handle_search,
    "list_repositories": _handle_list_repositories,
    "get_dependency_graph": _handle_dependency_graph,
    "analyze_code_style": _handle_code_style,
    "analyze_impact": _handle_impact,
    "get_repository_insights": _handle_insights,
    "get_codebase_dna": _handle_dna,
}


def _safe_error_message(tool_name: str, args: dict[str, Any], error: Exception) -> str:
    """Build error message with context but without leaking internal details."""
    repo_id = args.get("repo_id", "unknown")
    if isinstance(error, httpx.HTTPStatusError):
        status = error.response.status_code
        return f"Backend returned {status} for tool '{tool_name}' (repo: {repo_id})"
    if isinstance(error, httpx.TimeoutException):
        return f"Request timed out for tool '{tool_name}' (repo: {repo_id})"
    if isinstance(error, httpx.ConnectError):
        return f"Cannot connect to backend for tool '{tool_name}'. Is the server running?"
    if isinstance(error, ValueError):
        return str(error)
    return f"Unexpected error in tool '{tool_name}' (repo: {repo_id})"


async def call_tool(
    name: str, arguments: dict[str, Any] | None
) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    """Dispatch a tool call to the appropriate handler."""
    args = arguments or {}

    handler = _HANDLERS.get(name)
    if handler is None:
        return [types.TextContent(type="text", text=f"Unknown tool: {name}")]

    try:
        text = await handler(args)
        return [types.TextContent(type="text", text=text)]
    except Exception as e:
        msg = _safe_error_message(name, args, e)
        return [types.TextContent(type="text", text=msg)]
