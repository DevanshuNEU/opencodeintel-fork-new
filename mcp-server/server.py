#!/usr/bin/env python3
"""CodeIntel MCP Server entry point.

Provides codebase intelligence tools for LLMs via Model Context Protocol.
All tool definitions, handlers, and formatters are in their own modules.
"""
import asyncio

from mcp.server import Server
from mcp.server.models import InitializationOptions, ServerCapabilities
import mcp.server.stdio
import mcp.types as types

from config import SERVER_NAME, SERVER_VERSION
from tools import get_tool_schemas
from handlers import call_tool
from api_client import close_client

server = Server(SERVER_NAME)


@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    """Return all available tool schemas."""
    return get_tool_schemas()


@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict | None
) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    """Dispatch tool calls to the handler layer."""
    return await call_tool(name, arguments)


async def main() -> None:
    """Run the MCP server over stdio transport."""
    try:
        async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
            await server.run(
                read_stream,
                write_stream,
                InitializationOptions(
                    server_name=SERVER_NAME,
                    server_version=SERVER_VERSION,
                    capabilities=ServerCapabilities(tools={}),
                ),
            )
    finally:
        await close_client()


if __name__ == "__main__":
    asyncio.run(main())
