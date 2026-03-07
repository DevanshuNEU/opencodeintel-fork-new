"""Tool handler dispatch.

Maps tool names to their API calls and response formatters.
Each handler follows the same pattern: call API, format response.
Error handling is centralized in call_tool() so individual handlers stay clean.
"""
import logging
from typing import Any

import httpx
import mcp.types as types

logger = logging.getLogger(__name__)

from api_client import api_get, api_post, api_delete
from formatters import (
    format_codebase_dna,
    format_code_style,
    format_dependency_graph,
    format_impact_analysis,
    format_repositories,
    format_repository_insights,
    format_search_results,
)


def _clamp_max_results(raw: Any) -> int:
    """Validate and clamp max_results to [1, 100]."""
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return 10
    return max(1, min(value, 100))


async def _handle_search(args: dict[str, Any]) -> str:
    # Map tool schema's max_results to v2 API's top_k
    top_k = _clamp_max_results(args.get("max_results", 10))
    payload = {
        "query": args["query"],
        "repo_id": args["repo_id"],
        "top_k": top_k,
        "use_reranking": True,
    }
    result = await api_post("/search/v2", json=payload)
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


# --- Write tool handlers ---

async def _handle_add_repository(args: dict[str, Any]) -> str:
    payload = {
        "name": args["name"],
        "git_url": args["git_url"],
        "branch": args.get("branch", "main"),
    }
    result = await api_post("/repos", json=payload)
    repo_id = result.get("repo_id", "unknown")
    name = result.get("name", args["name"])
    status = result.get("status", "added")
    needs_selection = result.get("needs_directory_selection", False)
    lines = [
        f"Repository '{name}' added successfully.",
        f"ID: `{repo_id}`",
        f"Status: {status}",
    ]
    if needs_selection:
        lines.append(
            "\nThis repo may benefit from subset indexing. "
            "Use get_repo_directories to see available directories, "
            "then index_repository with include_paths."
        )
    else:
        lines.append(
            f"\nReady to index. Run: index_repository(repo_id='{repo_id}')"
        )
    return "\n".join(lines)


async def _handle_get_repo_directories(args: dict[str, Any]) -> str:
    result = await api_get(f"/repos/{args['repo_id']}/directories")
    dirs = result.get("directories", [])
    if not dirs:
        return "No directories found (repo may be flat or not yet cloned)."
    lines = ["# Repository Directories\n"]
    for d in dirs:
        name = d.get("name", d.get("path", "unknown"))
        count = d.get("file_count", 0)
        lines.append(f"- **{name}/** -- {count} code files")
    lines.append(
        "\nTo index specific directories, use index_repository "
        "with include_paths=['dir1', 'dir2']."
    )
    return "\n".join(lines)


async def _handle_index_repository(args: dict[str, Any]) -> str:
    repo_id = args["repo_id"]
    include_paths = args.get("include_paths")

    if include_paths:
        # Async endpoint supports include_paths for monorepo subset indexing
        result = await api_post(
            f"/repos/{repo_id}/index/async",
            json={"include_paths": include_paths},
        )
        status = result.get("status", "accepted")
        return (
            f"Async indexing started for subset: {', '.join(include_paths)}\n"
            f"Status: {status}\n"
            f"Repo ID: `{repo_id}`\n"
            "\nIndexing runs in the background. Use list_repositories "
            "to check when status changes to 'indexed'."
        )

    # Sync endpoint for full-repo indexing
    result = await api_post(f"/repos/{repo_id}/index", json={})
    status = result.get("status", "unknown")
    fn_count = result.get("functions", 0)
    lines = [
        "Indexing complete.",
        f"Status: {status}",
        f"Functions extracted: {fn_count}",
    ]
    lines.append(
        f"\nYou can now use search_code(repo_id='{repo_id}') "
        "to search this codebase."
    )
    return "\n".join(lines)


async def _handle_delete_repository(args: dict[str, Any]) -> str:
    repo_id = args["repo_id"]
    result = await api_delete(f"/repos/{repo_id}")
    msg = result.get("message", "Repository deleted.")
    return f"{msg}\nRepo ID `{repo_id}` has been removed."


# Tool name -> handler mapping
_HANDLERS: dict[str, Any] = {
    "search_code": _handle_search,
    "list_repositories": _handle_list_repositories,
    "get_dependency_graph": _handle_dependency_graph,
    "analyze_code_style": _handle_code_style,
    "analyze_impact": _handle_impact,
    "get_repository_insights": _handle_insights,
    "get_codebase_dna": _handle_dna,
    "add_repository": _handle_add_repository,
    "get_repo_directories": _handle_get_repo_directories,
    "index_repository": _handle_index_repository,
    "delete_repository": _handle_delete_repository,
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
        logger.warning("ValueError in tool '%s' (repo: %s): %s", tool_name, repo_id, error)
        return f"Tool input error for '{tool_name}' (repo: {repo_id})"
    logger.exception("Unexpected error in tool '%s' (repo: %s)", tool_name, repo_id)
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
