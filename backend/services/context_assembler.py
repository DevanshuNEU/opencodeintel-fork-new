"""Context assembly service for per-task context packaging.

Takes a task description + repo, finds the most relevant files via
semantic search, expands with 1-hop dependencies, matches applicable
project rules, and returns an assembled context package within a
token budget. This is the core of OPE-172.
"""
import asyncio
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from services.observability import logger

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


def _read_rules_file_sync(repo_path: Path) -> Tuple[Optional[str], Optional[str]]:
    """Find and read the first matching rules file in the repo (sync)."""
    for filename in RULES_FILES:
        rules_path = repo_path / filename
        if rules_path.exists() and rules_path.is_file():
            try:
                content = rules_path.read_text(encoding="utf-8", errors="replace")
                if content.strip():
                    return content, filename
            except OSError as exc:
                logger.warning("Could not read rules file", path=str(rules_path), error=str(exc))
    return None, None


def _load_deps_sync(repo_id: str) -> List[Dict]:
    """Load file dependencies from Supabase (sync)."""
    from services.supabase_service import get_supabase_service
    return get_supabase_service().get_file_dependencies(repo_id)


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
        from dependencies import indexer, get_repo_or_404

        repo = get_repo_or_404(repo_id, user_id)
        local_path_str = repo.get("local_path", "")

        # Step 1: Semantic search for the most relevant files
        search_results = await self._search(task, repo_id, indexer)
        found_files = self._unique_files(search_results)

        # Step 2: Expand with 1-hop dependencies (sync DB call off event loop)
        dep_files = await self._expand_deps(found_files, repo_id)

        # Step 3: Match relevant rule sections
        all_files = list(dict.fromkeys(found_files + dep_files))
        rules_content: Optional[str] = None
        rules_source: Optional[str] = None
        if local_path_str and Path(local_path_str).is_dir():
            rules_content, rules_source = await asyncio.to_thread(
                _read_rules_file_sync, Path(local_path_str),
            )
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
            logger.error("Context search failed", error=str(exc))
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
    async def _expand_deps(seed_files: List[str], repo_id: str) -> List[str]:
        """Add 1-hop imports/dependents for seed files."""
        try:
            all_deps = await asyncio.to_thread(_load_deps_sync, repo_id)
        except Exception as exc:
            logger.warning("Could not load deps for expansion", error=str(exc))
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
        remaining = budget - _estimate_tokens("\n".join(lines))

        # Tier 1: Relevant files (highest priority)
        if found_files and remaining > 50:
            header = "### Relevant files"
            header_cost = _estimate_tokens(header) + 1  # +1 for trailing blank line
            remaining -= header_cost
            tier_lines = [header]
            for r in search_results:
                fp = r.get("file_path", "")
                name = r.get("qualified_name", r.get("name", ""))
                score = r.get("score", 0)
                sig = r.get("signature", "")
                pct = f"{score * 100:.0f}%" if isinstance(score, float) else str(score)
                desc = sig if sig else name
                entry = f"- `{fp}` -- {desc} (relevance: {pct})"
                entry_tokens = _estimate_tokens(entry)
                if entry_tokens <= remaining:
                    tier_lines.append(entry)
                    remaining -= entry_tokens
                else:
                    break
            tier_lines.append("")
            lines.extend(tier_lines)

        # Tier 2: Dependency files
        if dep_files and remaining > 50:
            header = "### Depends on"
            header_cost = _estimate_tokens(header) + 1
            remaining -= header_cost
            tier_lines = [header]
            for fp in dep_files[:10]:
                entry = f"- `{fp}`"
                entry_tokens = _estimate_tokens(entry)
                if entry_tokens <= remaining:
                    tier_lines.append(entry)
                    remaining -= entry_tokens
                else:
                    break
            tier_lines.append("")
            lines.extend(tier_lines)

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
                    if chars_left > 20:
                        lines.append(section["body"][:chars_left] + "...")
                    break
            lines.append("")

        return "\n".join(lines)
