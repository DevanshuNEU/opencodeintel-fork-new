"""MCP server configuration from environment variables."""
import os

from dotenv import load_dotenv

load_dotenv()

API_VERSION = "v1"
API_PREFIX = f"/api/{API_VERSION}"

BACKEND_BASE_URL = os.getenv("BACKEND_API_URL", "http://localhost:8000")
BACKEND_API_URL = f"{BACKEND_BASE_URL}{API_PREFIX}"
# MCP_API_KEY takes precedence over API_KEY to avoid conflicts
# when Railway shares env vars across services in the same project
API_KEY = os.getenv("MCP_API_KEY", "") or os.getenv("API_KEY", "")

SERVER_NAME = "codeintel-mcp"
SERVER_VERSION = "0.5.0"

# Transport: "stdio" for local, "streamable-http" for remote deployment
TRANSPORT = os.getenv("MCP_TRANSPORT", "stdio")
HOST = os.getenv("MCP_HOST", "0.0.0.0")
_port_raw = os.getenv("PORT", "8080")
try:
    PORT = int(_port_raw)
    if not (1 <= PORT <= 65535):
        PORT = 8080
except ValueError:
    PORT = 8080

# Optional auth token for protecting the MCP endpoint in remote mode.
# If set, clients must send Authorization: Bearer <token> to /mcp.
MCP_AUTH_TOKEN = os.getenv("MCP_AUTH_TOKEN", "")
