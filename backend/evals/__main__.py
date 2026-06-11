"""CLI entry for the retrieval-quality eval (OCI #312).

Usage (from backend/):
    python -m evals               # record BOTH numbers: free tier + pro tier
    python -m evals --free-only   # free tier only (no Cohere, deterministic)
    python -m evals --pro-only    # pro tier only (Cohere rerank; needs COHERE_API_KEY)
"""
import argparse
import asyncio
from typing import Any, Dict

from .runner import run_eval


# out is the heterogeneous result dict from run_eval; Any is intentional
def _print_table(label: str, out: Dict[str, Any]) -> None:
    print(f"\n=== {label}  (tier={out['tier']}, reranking={out['reranking']}) ===")
    print(
        f"queries scored: {out['n_queries_scored']}   "
        f"empty/ambiguous: {out['n_empty_results']}   "
        f"skipped repos: {len(out['skipped_repos'])}"
    )
    if not out["metrics"]:
        print("  no metrics: no queries scored (index not populated?). See SKIP-LOUD lines above.")
        return
    for name, val in out["metrics"].items():
        print(f"  {name:<14} {val:.4f}")
    if out["empty_query_ids"]:
        print(
            f"  NOTE: empty results for queries {out['empty_query_ids']} "
            f"(counted as misses; investigate index/errors before trusting these numbers)."
        )


def main() -> None:
    ap = argparse.ArgumentParser(prog="python -m evals", description="OCI retrieval-quality eval (#312)")
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--free-only", action="store_true", help="free-tier only (no reranking)")
    g.add_argument("--pro-only", action="store_true", help="pro-tier only (Cohere reranking)")
    args = ap.parse_args()

    if args.free_only:
        _print_table("FREE TIER", asyncio.run(run_eval(reranking=False)))
        return
    if args.pro_only:
        _print_table("PRO TIER", asyncio.run(run_eval(reranking=True)))
        return

    # default: record both numbers so we can see exactly what reranking is worth
    free = asyncio.run(run_eval(reranking=False))
    _print_table("FREE TIER (core ranker)", free)
    try:
        pro = asyncio.run(run_eval(reranking=True))
        _print_table("PRO TIER (Cohere rerank)", pro)
        f10, p10 = free["metrics"].get("recall@10"), pro["metrics"].get("recall@10")
        if f10 is not None and p10 is not None:
            print(f"\nReranking delta recall@10: {p10 - f10:+.4f}  (what the pro tier buys)")
    except RuntimeError as e:
        print(f"\n[PRO TIER SKIPPED] {e}")


if __name__ == "__main__":
    main()
