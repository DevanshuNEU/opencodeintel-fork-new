"""Response formatters that convert API responses to markdown.

Each formatter is a pure function: takes API response dict, returns markdown string.
This makes them independently testable without any HTTP calls.
"""


def format_search_results(result: dict) -> str:
    """Format semantic search results as markdown.

    Supports both v1 (count/results) and v2 (total/results) response shapes
    so the formatter stays resilient across API versions.
    """
    total = result.get("total") or result.get("count", 0)
    cached = " (cached)" if result.get("cached") else ""
    version = result.get("search_version", "v1")
    output = f"# Code Search Results ({version})\n\nFound {total} results{cached}\n\n"

    if not result.get("results"):
        return output + "No results found.\n"

    for idx, res in enumerate(result["results"], 1):
        score = res.get("score", 0) * 100
        name = res.get("name", "unknown")
        file_path = res.get("file_path", "unknown")
        lang = res.get("language", "unknown")
        line_start = res.get("line_start", 0)
        line_end = res.get("line_end", 0)
        code = res.get("code", "")

        output += f"## {idx}. {name} ({score:.0f}% match)\n"
        output += f"**File:** `{file_path}`\n"

        # v2 adds qualified_name and signature
        qualified = res.get("qualified_name")
        if qualified and qualified != name:
            output += f"**Qualified:** `{qualified}`\n"
        signature = res.get("signature")
        if signature:
            output += f"**Signature:** `{signature}`\n"

        output += f"**Language:** {lang} | **Lines:** {line_start}-{line_end}\n"

        reason = res.get("match_reason")
        if reason:
            output += f"**Why:** {reason}\n"

        output += f"\n```{lang}\n{code}\n```\n\n"

    return output


def format_repositories(result: dict) -> str:
    """Format repository listing as markdown."""
    output = "# Indexed Repositories\n\n"

    if not result.get("repositories"):
        return output + "No repositories indexed yet.\n"

    for repo in result["repositories"]:
        output += f"### {repo.get('name', 'unknown')}\n"
        output += f"- **ID:** `{repo.get('id')}`\n"
        output += f"- **Status:** {repo.get('status', 'unknown')}\n"
        output += f"- **Functions:** {repo.get('file_count', 0):,}\n"
        output += f"- **Branch:** {repo.get('branch', 'main')}\n\n"

    return output


def format_dependency_graph(result: dict) -> str:
    """Format dependency graph analysis as markdown."""
    nodes = result.get("nodes", [])
    edges = result.get("edges", [])
    metrics = result.get("metrics", {})

    output = "# Dependency Graph Analysis\n\n"
    output += f"**Total Files:** {len(nodes)}\n"
    output += f"**Total Dependencies:** {metrics.get('total_edges', len(edges))}\n"
    output += f"**Avg Dependencies per File:** {metrics.get('avg_dependencies', 0):.1f}\n\n"

    # Most-imported files (highest number of dependents)
    dependent_count: dict[str, int] = {}
    for edge in edges:
        target = edge.get("target", "")
        dependent_count[target] = dependent_count.get(target, 0) + 1

    if dependent_count:
        sorted_deps = sorted(
            dependent_count.items(), key=lambda x: x[1], reverse=True
        )[:5]
        output += "## Most Critical Files (High Impact)\n\n"
        for file, count in sorted_deps:
            output += f"- `{file}` - **{count} dependents**\n"
        output += "\n"

    high_import = [n for n in nodes if n.get("imports", 0) >= 3]
    if high_import:
        output += "## Files with Most Imports\n\n"
        for f in sorted(high_import, key=lambda x: x.get("imports", 0), reverse=True)[:5]:
            output += f"- `{f['id']}` - imports {f['imports']} files\n"

    return output


def format_code_style(result: dict) -> str:
    """Format code style analysis as markdown."""
    summary = result.get("summary", {})
    output = "# Code Style Analysis\n\n"
    output += f"**Files Analyzed:** {summary.get('total_files_analyzed', 0)}\n"
    output += f"**Functions:** {summary.get('total_functions', 0)}\n"
    output += f"**Async Adoption:** {summary.get('async_adoption', '0%')}\n"
    output += f"**Type Hints:** {summary.get('type_hints_usage', '0%')}\n\n"

    naming = result.get("naming_conventions", {}).get("functions")
    if naming:
        output += "## Function Naming Conventions\n\n"
        for conv, info in naming.items():
            output += f"- **{conv}:** {info['percentage']} ({info['count']} functions)\n"
        output += "\n"

    top_imports = result.get("top_imports")
    if top_imports:
        output += "## Most Common Imports\n\n"
        for item in top_imports[:10]:
            output += f"- `{item['module']}` (used {item['count']}x)\n"

    return output


def format_impact_analysis(result: dict) -> str:
    """Format file impact analysis as markdown."""
    output = f"# Impact Analysis: {result.get('file', 'unknown')}\n\n"
    output += f"**Risk Level:** {result.get('risk_level', 'unknown').upper()}\n"
    output += f"**Impact Summary:** {result.get('impact_summary', '')}\n\n"

    deps = result.get("direct_dependencies", [])
    output += f"## Dependencies ({len(deps)})\n"
    output += "Files this file imports:\n"
    for dep in deps[:10]:
        output += f"- `{dep}`\n"
    output += "\n"

    dependents = result.get("all_dependents", [])
    output += f"## Dependents ({len(dependents)})\n"
    output += "Files that would be affected by changes:\n"
    for dep in dependents[:15]:
        output += f"- `{dep}`\n"

    test_files = result.get("test_files")
    if test_files:
        output += "\n## Related Tests\n"
        for test in test_files:
            output += f"- `{test}`\n"

    return output


def format_repository_insights(result: dict) -> str:
    """Format repository insights as markdown."""
    output = f"# Repository Insights: {result.get('name', 'unknown')}\n\n"
    output += f"**Status:** {result.get('status', 'unknown')}\n"
    output += f"**Functions Indexed:** {result.get('functions_indexed', 0):,}\n"
    output += f"**Total Files:** {result.get('total_files', 0)}\n"
    output += f"**Total Dependencies:** {result.get('total_dependencies', 0)}\n\n"

    metrics = result.get("graph_metrics", {})
    critical = metrics.get("most_critical_files")
    if critical:
        output += "## Most Critical Files\n"
        for item in critical[:5]:
            output += f"- `{item['file']}` ({item['dependents']} dependents)\n"

    return output


def format_codebase_dna(result: dict) -> str:
    """Format codebase DNA extraction as markdown."""
    dna_markdown = result.get("dna", "")
    cached = " (cached)" if result.get("cached") else ""

    output = f"# Codebase DNA{cached}\n\n"
    output += "**Use this information to write code that matches existing patterns.**\n\n"
    output += dna_markdown
    output += "\n---\n"
    output += "**Instructions:** When generating code for this codebase:\n"
    output += "1. Follow the auth patterns shown above\n"
    output += "2. Use the service layer structure (singletons in dependencies.py)\n"
    output += "3. Match the database conventions (ID types, timestamps, RLS)\n"
    output += "4. Use the logging patterns shown\n"
    output += "5. Follow the naming conventions\n"

    return output
