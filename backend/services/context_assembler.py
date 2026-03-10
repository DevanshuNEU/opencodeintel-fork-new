"""Context assembly service for per-task context packaging.

Takes a task description + repo, finds the most relevant files via
semantic search, expands with 1-hop dependencies, matches applicable
project rules, and returns an assembled context package within a
token budget. This is the core of OPE-172.
"""
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Rule files in priority order (first found wins, same as dna_extractor)
RULES_FILES = [
    "CLAUDE.md", "AGENTS.md", ".cursorrules",
    ".codeintel/rules.md", "CONVENTIONS.md",
    ".github/copilot-instructions.md", "CODING_GUIDELINES.md",
]

# Sections that apply to every task regardless of file matches
ALWAYS_RELEVANT_PATTERNS = re.compile(
    r"(git|commit|workflow|what not to do|never|critical|do not|testing|review)",
    re.IGNORECASE,
)


def _estimate_tokens(text: str) -> int:
    """Rough token estimate: 1 token per 4 chars."""
    return len(text) // 4


def _split_rules_into_sections(content: str) -> List[Dict[str, str]]:
    """Split markdown content by ## headers into discrete sections."""
    sections: List[Dict[str, str]] = []
    current_header = ""
    current_body: List[str] = []

    for line in content.splitlines():
        if line.startswith("## "):
            if current_header or current_body:
                sections.append({
                    "header": current_header,
                    "body": "\n".join(current_body).strip(),
                })
            current_header = line
            current_body = []
        else:
            current_body.append(line)

    # Capture the last section
    if current_header or current_body:
        sections.append({
            "header": current_header,
            "body": "\n".join(current_body).strip(),
        })

    return sections


def _read_rules_file(repo_path: Path) -> Tuple[Optional[str], Optional[str]]:
    """Find and read the first matching rules file in the repo."""
    for filename in RULES_FILES:
        rules_path = repo_path / filename
        if rules_path.exists() and rules_path.is_file():
            try:
                content = rules_path.read_text(encoding="utf-8", errors="replace")
                if content.strip():
                    return content, filename
            except OSError as exc:
                logger.warning("Could not read rules file %s: %s", rules_path, exc)
    return None, None


class ContextAssembler:
    """Assembles per-task context from semantic search + deps + rules."""

    async def assemble(
        self,
        task: str,
        repo_id: str,
        user_id: str,
        token_budget: int = 1500,
    ) -> Dict[str, Any]:
        """Build a context package for a specific coding task.

        Returns dict with 'context' (markdown string), 'files_found',
        'tokens_used', and 'debug' metadata.
        """
        from dependencies import indexer, dependency_analyzer, get_repo_or_404
        from services.supabase_service import get_supabase_service

        repo = get_repo_or_404(repo_id, user_id)
        local_path = Path(repo.get("local_path", ""))

        # Step 1: Semantic search for the most relevant files
        search_results = await self._search(task, repo_id, indexer)
        found_files = self._unique_files(search_results)

        # Step 2: Expand with 1-hop dependencies
        dep_files = self._expand_deps(found_files, repo_id, get_supabase_service())

        # Step 3: Match relevant rule sections
        all_files = list(dict.fromkeys(found_files + dep_files))
        rules_content, rules_source = _read_rules_file(local_path)
        matched_rules = self._match_rules(rules_content, all_files) if rules_content else []

        # Step 4: Assemble within token budget
        context_md = self._build_package(
            task, search_results, found_files, dep_files,
            matched_rules, token_budget,
        )

        return {
            "context": context_md,
            "files_found": len(all_files),
            "tokens_used": _estimate_tokens(context_md),
            "token_budget": token_budget,
            "rules_source": rules_source,
            "search_hits": len(search_results),
            "dep_files_added": len(dep_files),
            "rule_sections_matched": len(matched_rules),
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _search(
        self, task: str, repo_id: str, indexer: Any, top_k: int = 5,
    ) -> List[Dict]:
        """Run semantic search and return top results."""
        try:
            results = await indexer.search_v2(
                query=task, repo_id=repo_id, top_k=top_k, use_reranking=True,
            )
            return results
        except Exception as exc:
            logger.error("Context search failed: %s", exc)
            return []

    @staticmethod
    def _unique_files(results: List[Dict]) -> List[str]:
        """Extract unique file paths from search results, preserving order."""
        seen: set[str] = set()
        files: List[str] = []
        for r in results:
            fp = r.get("file_path", "")
            if fp and fp not in seen:
                seen.add(fp)
                files.append(fp)
        return files

    @staticmethod
    def _expand_deps(
        seed_files: List[str], repo_id: str, db: Any,
    ) -> List[str]:
        """Add 1-hop imports/dependents for seed files."""
        try:
            all_deps = db.get_file_dependencies(repo_id)
        except Exception as exc:
            logger.warning("Could not load deps for expansion: %s", exc)
            return []

        # Build adjacency maps
        imports_map: Dict[str, List[str]] = {}
        dependents_map: Dict[str, List[str]] = {}
        for row in all_deps:
            fp = row.get("file_path", "")
            deps = row.get("depends_on", [])
            imports_map[fp] = deps
            for dep in deps:
                dependents_map.setdefault(dep, []).append(fp)

        seed_set = set(seed_files)
        expanded: List[str] = []
        for fp in seed_files:
            for imp in imports_map.get(fp, []):
                if imp not in seed_set and imp not in expanded:
                    expanded.append(imp)
            for dep in dependents_map.get(fp, []):
                if dep not in seed_set and dep not in expanded:
                    expanded.append(dep)

        return expanded

    @staticmethod
    def _match_rules(
        rules_content: str, files: List[str],
    ) -> List[Dict[str, str]]:
        """Return rule sections relevant to the discovered files."""
        sections = _split_rules_into_sections(rules_content)
        stems = {Path(f).stem for f in files}
        names = {Path(f).name for f in files}

        matched: List[Dict[str, str]] = []
        for section in sections:
            header = section["header"]
            body = section["body"]
            combined = f"{header}\n{body}"

            # Always-relevant sections (git rules, "what not to do", etc.)
            if ALWAYS_RELEVANT_PATTERNS.search(header):
                matched.append(section)
                continue

            # Sections mentioning any discovered file
            if any(name in combined for name in names):
                matched.append(section)
                continue
            if any(stem in combined for stem in stems if len(stem) > 2):
                matched.append(section)

        return matched

    @staticmethod
    def _build_package(
        task: str,
        search_results: List[Dict],
        found_files: List[str],
        dep_files: List[str],
        matched_rules: List[Dict[str, str]],
        budget: int,
    ) -> str:
        """Assemble markdown context package within token budget."""
        lines: List[str] = [f'## Context for: "{task}"', ""]

        # Tier 1: Relevant files (highest priority)
        if found_files:
            lines.append("### Relevant files")
            for r in search_results:
                fp = r.get("file_path", "")
                name = r.get("qualified_name", r.get("name", ""))
                score = r.get("score", 0)
                sig = r.get("signature", "")
                pct = f"{score * 100:.0f}%" if isinstance(score, float) else str(score)
                desc = sig if sig else name
                lines.append(f"- `{fp}` -- {desc} (relevance: {pct})")
            lines.append("")

        # Tier 2: Dependency files
        if dep_files:
            lines.append("### Depends on")
            for fp in dep_files[:10]:
                lines.append(f"- `{fp}`")
            lines.append("")

        # Check budget before adding rules
        current = _estimate_tokens("\n".join(lines))
        remaining = budget - current

        # Tier 3: Matched rules
        if matched_rules and remaining > 50:
            lines.append("### Rules that apply")
            for section in matched_rules:
                section_text = section["header"] + "\n" + section["body"]
                section_tokens = _estimate_tokens(section_text)
                if section_tokens <= remaining:
                    lines.append(section["body"])
                    remaining -= section_tokens
                else:
                    # Truncate the last section to fit
                    chars_left = remaining * 4
                    lines.append(section["body"][:chars_left] + "...")
                    break
            lines.append("")

        return "\n".join(lines)
