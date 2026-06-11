"""Offline retrieval-quality eval over the live search_v2 ranker (OCI #312).

Deterministic by construction: a fixed query set + a fixed index + no result cache.
The indexer singleton and ranx are imported INSIDE functions so this module never
touches the backend startup path (oci known-bug #3).

Tiers (Cohere reranking is pro-only -- you pay for Cohere):
  reranking=False -> free tier  (deterministic BM25 + vector core ranker, no Cohere)
  reranking=True  -> pro tier   (Cohere rerank; requires COHERE_API_KEY)
"""
import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING, Any, Dict, List, Sequence, Tuple

if TYPE_CHECKING:  # typing-only import; avoids the heavy runtime import (known-bug #3)
    from services.indexer_optimized import OptimizedCodeIndexer

EVAL_DIR = Path(__file__).parent
GROUND_TRUTH_PATH = EVAL_DIR / "ground_truth" / "queries.json"
BASELINE_PATH = EVAL_DIR / "baseline.json"
RESULTS_DIR = EVAL_DIR / "results"
DEFAULT_REPO_ID = os.getenv("OCI_EVAL_REPO_ID", "78aa181e-2bbb-438b-97ee-9ffd494c4815")
TOP_K = 10
K_VALUES: Sequence[int] = (5, 10)


def load_ground_truth(path: Path = GROUND_TRUTH_PATH) -> List[dict]:
    return json.loads(path.read_text())["queries"]


def load_baseline(path: Path = BASELINE_PATH) -> dict:
    return json.loads(path.read_text())


def _dedupe_files_by_rank(results: List[dict]) -> List[Tuple[str, float]]:
    """search_v2 returns function-level hits; collapse to file-level, keeping the
    best (first) rank per file. Returns [(file_path, score)] in rank order."""
    seen: Dict[str, float] = {}
    for r in results:
        fp = r.get("file_path") or ""
        if fp and fp not in seen:
            seen[fp] = float(r.get("score", 0.0))
    return list(seen.items())


async def _preflight(indexer: "OptimizedCodeIndexer", repo_id: str) -> bool:
    """Fail-closed corpus check: does the index actually have vectors for this repo?

    Guards against measuring a stale/empty index (known-bug #4: Pinecone is eventual
    and may be unprovisioned). Reranking off so the probe is cheap and never needs
    Cohere. A missing index or a swallowed search error both surface as 0 hits -> skip.
    """
    if getattr(indexer, "index", None) is None:
        return False
    try:
        probe = await indexer.search_v2(query="function", repo_id=repo_id, top_k=1, use_reranking=False)
        return len(probe) > 0
    except Exception:
        return False


def _write_results(path: Path, payload: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(payload)


# returns a heterogeneous result dict (metrics + per-query breakdown + metadata); Any is intentional
async def run_eval(reranking: bool, repo_id_default: str = DEFAULT_REPO_ID) -> Dict[str, Any]:
    """Run the full query set through search_v2 and compute metrics for one tier."""
    from dependencies import indexer  # isolated import (known-bug #3)

    from .metrics import compute_metrics

    if reranking and not os.getenv("COHERE_API_KEY"):
        raise RuntimeError(
            "Pro-tier (reranked) eval requested but COHERE_API_KEY is not set. "
            "Cohere reranking is pro-only; set the key or run free-tier (--free-only)."
        )

    queries = load_ground_truth()
    qrels: Dict[str, Dict[str, int]] = {}
    run: Dict[str, Dict[str, float]] = {}
    per_query: List[dict] = []
    empties: List[str] = []
    skipped_repos = set()
    preflight_cache: Dict[str, bool] = {}

    for q in queries:
        qid = str(q["query_id"])
        repo_id = q.get("repo_id") or repo_id_default

        if repo_id not in preflight_cache:
            preflight_cache[repo_id] = await _preflight(indexer, repo_id)
        if not preflight_cache[repo_id]:
            skipped_repos.add(repo_id)
            print(
                f"[SKIP-LOUD] repo {repo_id} has no vectors in the index; skipping "
                f"query {qid} (measuring it would corrupt recall). Index the repo first."
            )
            continue

        expected = list(q["expected_files"])
        qrels[qid] = {fp: 1 for fp in expected}

        results = await indexer.search_v2(
            query=q["query"], repo_id=repo_id, top_k=TOP_K, use_reranking=reranking
        )
        if not results:
            # FM-3: search_v2 swallows exceptions and returns []. We cannot tell a true
            # no-hit from a swallowed error here, so flag it loudly instead of hiding it.
            empties.append(qid)

        ranked = _dedupe_files_by_rank(results)
        ranked_paths = [fp for fp, _ in ranked]
        run[qid] = {fp: score for fp, score in ranked} or {"__no_results__": 0.0}

        expected_ranks = {
            fp: (ranked_paths.index(fp) + 1 if fp in ranked_paths else None) for fp in expected
        }
        per_query.append(
            {
                "query_id": qid,
                "query": q["query"],
                "repo_id": repo_id,
                "expected_files": expected,
                "returned_files": ranked_paths,
                "expected_ranks": expected_ranks,
                "empty_result": qid in empties,
            }
        )

    metrics = compute_metrics(qrels, run, K_VALUES) if qrels else {}

    tier = "pro_reranked" if reranking else "free_core"
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out = {
        "timestamp": ts,
        "tier": tier,
        "reranking": reranking,
        "n_queries_scored": len(qrels),
        "n_empty_results": len(empties),
        "empty_query_ids": empties,
        "skipped_repos": sorted(skipped_repos),
        "metrics": metrics,
        "per_query": per_query,
    }
    results_path = RESULTS_DIR / f"eval_{tier}_{ts}.json"
    # write off the event loop so this async function stays non-blocking (backend rule)
    await asyncio.to_thread(_write_results, results_path, json.dumps(out, indent=2))
    return out
