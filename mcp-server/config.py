"""MCP server configuration from environment variables."""
import os

from dotenv import load_dotenv

load_dotenv()

API_VERSION = "v1"
API_PREFIX = f"/api/{API_VERSION}"

BACKEND_BASE_URL = os.getenv("BACKEND_API_URL", "http://localhost:8000")
BACKEND_API_URL = f"{BACKEND_BASE_URL}{API_PREFIX}"
API_KEY = os.getenv("API_KEY", "")

SERVER_NAME = "codeintel-mcp"
SERVER_VERSION = "0.5.0"

# Transport: "stdio" for local, "streamable-http" for remote deployment
TRANSPORT = os.getenv("MCP_TRANSPORT", "stdio")
HOST = os.getenv("MCP_HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8080"))
