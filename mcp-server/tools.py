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
                        "minimum": 1,
                        "maximum": 100,
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
        # --- Write tools ---
        types.Tool(
            name="add_repository",
            description=(
                "Add a new repository for indexing. Clones the repo and analyzes "
                "its structure. After adding, use get_repo_directories to see "
                "available directories, then index_repository to start indexing."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "git_url": {
                        "type": "string",
                        "description": (
                            "Git clone URL. "
                            "Example: https://github.com/owner/repo.git"
                        ),
                    },
                    "name": {
                        "type": "string",
                        "description": "Short name for the repository",
                    },
                    "branch": {
                        "type": "string",
                        "description": "Branch to clone (default: main)",
                        "default": "main",
                    },
                },
                "required": ["git_url", "name"],
            },
        ),
        types.Tool(
            name="get_repo_directories",
            description=(
                "List top-level directories in a cloned repository with file "
                "counts. Use this after add_repository to decide which "
                "directories to index (useful for monorepos)."
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
            name="index_repository",
            description=(
                "Trigger indexing for a repository. Extracts functions, builds "
                "embeddings, and enables semantic search. For monorepos, pass "
                "include_paths to index only specific directories."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "repo_id": {
                        "type": "string",
                        "description": "Repository identifier",
                    },
                    "include_paths": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": (
                            "Optional list of directories to index "
                            "(e.g. ['src', 'lib']). Omit to index everything."
                        ),
                    },
                },
                "required": ["repo_id"],
            },
        ),
        types.Tool(
            name="delete_repository",
            description=(
                "Delete a repository and all its indexed data. This is "
                "irreversible -- the repo must be re-added and re-indexed."
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
