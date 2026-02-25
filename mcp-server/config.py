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
SERVER_VERSION = "0.4.0"
