#!/usr/bin/env python3
"""CodeIntel MCP Server entry point.

Supports two transport modes:
  stdio            - Local dev, Claude Desktop config (default)
  streamable-http  - Remote deployment, Claude.ai Connectors

Usage:
  python server.py                    # stdio (default)
  python server.py --transport http   # streamable HTTP on $PORT
"""
import sys

from mcp.server.fastmcp import FastMCP
import mcp.types as types
from starlette.routing import Route
from starlette.responses import JSONResponse

from config import SERVER_NAME, SERVER_VERSION, TRANSPORT, HOST, PORT
from tools import get_tool_schemas
from handlers import call_tool

mcp = FastMCP(
    name=SERVER_NAME,
    instructions=(
        "CodeIntel provides semantic code search, dependency analysis, "
        "and codebase intelligence. Use list_repositories first to find "
        "repo IDs, then search_code or get_codebase_dna for context."
    ),
    host=HOST,
    port=PORT,
    streamable_http_path="/mcp",
    stateless_http=True,
    log_level="INFO",
)

# Register tools at the low-level MCP server layer.
# FastMCP's @tool decorator infers schemas from function signatures,
# but we have well-tested schemas in tools.py and dispatch in handlers.py.
# We access the private _mcp_server to register custom inputSchema directly.
# TODO: monitor mcp-python for a public API to register tools with custom schemas
#       (see: https://github.com/modelcontextprotocol/python-sdk/issues)
_server = mcp._mcp_server  # pinned to mcp>=1.25.0,<2.0.0


@_server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    """Return all available tool schemas."""
    return get_tool_schemas()


@_server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict | None
) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    """Dispatch tool calls to the handler layer."""
    return await call_tool(name, arguments)


# Health check for Railway/load balancers
async def _health(request):
    return JSONResponse({"status": "ok", "server": SERVER_NAME, "version": SERVER_VERSION})


def _get_http_app():
    """Build the Starlette app with health check + MCP endpoint."""
    app = mcp.streamable_http_app()
    app.routes.insert(0, Route("/health", _health, methods=["GET"]))
    return app


_VALID_TRANSPORTS = {"stdio", "streamable-http", "http"}


def main():
    """Run with configured transport."""
    transport = TRANSPORT

    # CLI override: --transport http
    if "--transport" in sys.argv:
        idx = sys.argv.index("--transport")
        if idx + 1 < len(sys.argv):
            transport = sys.argv[idx + 1]

    # Normalize alias
    if transport == "http":
        transport = "streamable-http"

    if transport not in ("stdio", "streamable-http"):
        print(f"Error: unknown transport '{transport}'. Use 'stdio' or 'http'.")
        sys.exit(1)

    if transport == "streamable-http":
        import uvicorn
        print(f"Starting {SERVER_NAME} v{SERVER_VERSION} on {HOST}:{PORT}/mcp")
        uvicorn.run(_get_http_app(), host=HOST, port=PORT)
    else:
        mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
