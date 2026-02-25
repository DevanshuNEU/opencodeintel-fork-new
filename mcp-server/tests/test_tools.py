"""Tests for tool schema definitions.

Validates that tool schemas follow MCP protocol requirements
and that adding/removing tools doesn't break the schema contract.
"""
import pytest

from tools import get_tool_schemas

EXPECTED_TOOLS = {
    "search_code",
    "list_repositories",
    "get_dependency_graph",
    "analyze_code_style",
    "analyze_impact",
    "get_repository_insights",
    "get_codebase_dna",
}


class TestToolSchemas:
    def test_all_tools_registered(self):
        schemas = get_tool_schemas()
        names = {t.name for t in schemas}
        assert names == EXPECTED_TOOLS

    def test_no_duplicate_names(self):
        schemas = get_tool_schemas()
        names = [t.name for t in schemas]
        assert len(names) == len(set(names))

    def test_all_have_descriptions(self):
        """Every tool needs a description -- LLMs use it to decide when to call."""
        for tool in get_tool_schemas():
            assert tool.description, f"{tool.name} has no description"
            assert len(tool.description) > 20, f"{tool.name} description too short"

    def test_all_have_valid_input_schema(self):
        for tool in get_tool_schemas():
            schema = tool.inputSchema
            assert schema.get("type") == "object", f"{tool.name} schema not object"
            assert "properties" in schema, f"{tool.name} missing properties"

    def test_search_requires_query_and_repo(self):
        schemas = {t.name: t for t in get_tool_schemas()}
        search = schemas["search_code"]
        assert "query" in search.inputSchema["required"]
        assert "repo_id" in search.inputSchema["required"]

    def test_repo_tools_require_repo_id(self):
        """Tools that operate on a repo should require repo_id."""
        schemas = {t.name: t for t in get_tool_schemas()}
        repo_tools = [
            "get_dependency_graph", "analyze_code_style",
            "analyze_impact", "get_repository_insights", "get_codebase_dna",
        ]
        for name in repo_tools:
            required = schemas[name].inputSchema.get("required", [])
            assert "repo_id" in required, f"{name} should require repo_id"

    def test_search_max_results_bounded(self):
        """max_results schema should have min/max to prevent invalid searches."""
        schemas = {t.name: t for t in get_tool_schemas()}
        max_results = schemas["search_code"].inputSchema["properties"]["max_results"]
        assert max_results["type"] == "integer"
        assert max_results["minimum"] >= 1
        assert max_results["maximum"] > max_results["minimum"]

    def test_list_repos_has_no_required_fields(self):
        schemas = {t.name: t for t in get_tool_schemas()}
        list_repos = schemas["list_repositories"]
        assert "required" not in list_repos.inputSchema
