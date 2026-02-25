"""MCP tool schema definitions.

Each tool has a name, description, and JSON Schema for its input.
Descriptions are optimized for LLM consumption -- they tell the model
WHEN and WHY to use each tool, not just what it does.
"""
import mcp.types as types


def get_tool_schemas() -> list[types.Tool]:
    """Return all available tool definitions."""
    return [
        types.Tool(
            name="search_code",
            description=(
                "Semantically search code in a repository. Finds code by meaning, "
                "not just keywords. Use this to find existing implementations, "
                "patterns, or specific functionality."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": (
                            "Search query (natural language or code snippet). "
                            "Examples: 'authentication middleware', "
                            "'React hook for state', 'database connection pool'"
                        ),
                    },
                    "repo_id": {
                        "type": "string",
                        "description": "Repository identifier",
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Maximum number of results (default: 10)",
                        "default": 10,
                    },
                },
                "required": ["query", "repo_id"],
            },
        ),
        types.Tool(
            name="list_repositories",
            description="List all indexed repositories available for analysis",
            inputSchema={"type": "object", "properties": {}},
        ),
        types.Tool(
            name="get_dependency_graph",
            description=(
                "Get the complete dependency graph for a repository. Shows which "
                "files depend on which, identifies critical files, and reveals "
                "architecture patterns."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "repo_id": {
                        "type": "string",
                        "description": "Repository identifier",
                    }
                },
                "required": ["repo_id"],
            },
        ),
        types.Tool(
            name="analyze_code_style",
            description=(
                "Analyze team coding patterns and conventions. Returns naming "
                "conventions, async usage, type hint usage, common imports, and "
                "coding patterns. Use this to match team style when generating code."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "repo_id": {
                        "type": "string",
                        "description": "Repository identifier",
                    }
                },
                "required": ["repo_id"],
            },
        ),
        types.Tool(
            name="analyze_impact",
            description=(
                "Analyze the impact of changing a specific file. Shows what files "
                "depend on it, what it depends on, risk level, and related test "
                "files. Critical for understanding change consequences."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "repo_id": {
                        "type": "string",
                        "description": "Repository identifier",
                    },
                    "file_path": {
                        "type": "string",
                        "description": "Path to the file to analyze (relative to repo root)",
                    },
                },
                "required": ["repo_id", "file_path"],
            },
        ),
        types.Tool(
            name="get_repository_insights",
            description=(
                "Get comprehensive insights about a repository including dependency "
                "metrics, code style summary, and architecture overview. Use this "
                "for high-level codebase understanding."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "repo_id": {
                        "type": "string",
                        "description": "Repository identifier",
                    }
                },
                "required": ["repo_id"],
            },
        ),
        types.Tool(
            name="get_codebase_dna",
            description=(
                "Extract the architectural DNA of a codebase. Returns patterns, "
                "conventions, and constraints that define how code should be written. "
                "Use this BEFORE generating any code to understand: auth patterns, "
                "service layer structure, database conventions, error handling, "
                "logging patterns, naming conventions, and common imports. This "
                "ensures generated code matches existing architecture."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "repo_id": {
                        "type": "string",
                        "description": "Repository identifier",
                    }
                },
                "required": ["repo_id"],
            },
        ),
    ]
