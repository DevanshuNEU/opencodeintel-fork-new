#!/usr/bin/env python3
"""CodeIntel MCP Server entry point.

Supports two transport modes:
  stdio            - Local dev, Claude Desktop config (default)
  streamable-http  - Remote deployment, Claude.ai Connectors

Usage:
  python server.py                    # stdio (default)
  python server.py --transport http   # streamable HTTP on $PORT
"""
import json
import logging
import sys
from typing import Optional

from mcp.server.fastmcp import FastMCP
import mcp.types as types
from starlette.routing import Route
from starlette.responses import JSONResponse

from api_client import set_request_api_key
from config import SERVER_NAME, SERVER_VERSION, TRANSPORT, HOST, PORT, MCP_AUTH_TOKEN
from tools import get_tool_schemas
from handlers import call_tool

logger = logging.getLogger(__name__)

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


def _extract_bearer(scope) -> Optional[str]:
    """Pull the Bearer token from an ASGI scope's headers, or None.

    Requires the space after 'Bearer' -- a missing space is the PR #292 bug, and a
    request carrying it is treated as malformed (rejected), never silently parsed.
    """
    for name, value in scope.get("headers", []):
        if name == b"authorization":
            raw = value.decode("latin-1")
            if raw.startswith("Bearer "):
                return raw[len("Bearer "):].strip()
            return None
    return None


def _key_suffix(token: str) -> str:
    """Last 8 chars for safe log correlation. Never log the full key (bug #7)."""
    return token[-8:] if len(token) >= 8 else "********"


async def _send_401(send, detail: str) -> None:
    body = json.dumps({"error": detail}).encode()
    await send({
        "type": "http.response.start",
        "status": 401,
        "headers": [
            (b"content-type", b"application/json"),
            (b"www-authenticate", b"Bearer"),
        ],
    })
    await send({"type": "http.response.body", "body": body})


class MCPAuthMiddleware:
    """Authenticate /mcp with a per-user ci_ key, forwarded to the backend.

    Pure ASGI (not BaseHTTPMiddleware) on purpose: the ContextVar set here must
    propagate to the tool-handler task, and BaseHTTPMiddleware runs the downstream
    app in a separate task that breaks that propagation.

    Fails closed -- a missing or invalid credential is a 401, never a fallback to a
    shared identity for data calls. /health stays public.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        if scope.get("path") == "/health":
            await self.app(scope, receive, send)
            return

        token = _extract_bearer(scope)
        if not token:
            logger.warning("mcp auth: missing or malformed Authorization header")
            await _send_401(send, "Missing or malformed Authorization header")
            return

        if token.startswith("ci_"):
            # Per-user key: carry the caller's own identity to the backend.
            set_request_api_key(token)
            logger.info("mcp auth: ci_ key accepted (suffix=%s)", _key_suffix(token))
            await self.app(scope, receive, send)
            return

        if MCP_AUTH_TOKEN and token == MCP_AUTH_TOKEN:
            # Admin path: authenticates the endpoint only. No user key is set, so
            # api_client uses the configured key -- the data scope is not widened.
            logger.info("mcp auth: admin token accepted")
            await self.app(scope, receive, send)
            return

        logger.warning("mcp auth: invalid token rejected (suffix=%s)", _key_suffix(token))
        await _send_401(send, "Invalid API key")


def _get_http_app():
    """Build the Starlette app: public /health + auth-required /mcp."""
    app = mcp.streamable_http_app()
    app.routes.insert(0, Route("/health", _health, methods=["GET"]))
    # Always enforce: remote /mcp requires a per-user ci_ key (or the admin token).
    app.add_middleware(MCPAuthMiddleware)
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
