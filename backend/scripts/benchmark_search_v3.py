#!/usr/bin/env python3
"""
Search V3 vs V2 Benchmark
Run with: python3 scripts/benchmark_search_v3.py

Compares:
- V2 (OpenAI embeddings + Cohere reranking)
- V3 (Voyage AI embeddings + Query Understanding + Code Graph + Cohere reranking)
"""
import asyncio
import os
import sys
import time
from typing import List, Dict, Tuple

# add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from services.indexer_optimized import OptimizedCodeIndexer

# Test queries representing real developer scenarios
TEST_QUERIES = [
    {
        "query": "how to add authentication",
        "expected_keywords": ["auth", "middleware", "authenticate", "credential"],
        "description": "Developer wants to add auth to their app"
    },
    {
        "query": "handle websocket messages",
        "expected_keywords": ["websocket", "message", "send", "receive", "on_"],
        "description": "Developer working with WebSockets"
    },
    {
        "query": "return json from endpoint",
        "expected_keywords": ["json", "response", "jsonresponse", "return"],
        "description": "Developer wants to return JSON data"
    },
    {
        "query": "validate request data",
        "expected_keywords": ["valid", "request", "data", "schema"],
        "description": "Developer needs input validation"
    },
    {
        "query": "middleware that runs before request",
        "expected_keywords": ["middleware", "before", "dispatch", "call_next"],
        "description": "Developer needs pre-request processing"
    },
    {
        "query": "error handling",
        "expected_keywords": ["error", "exception", "handler", "catch"],
        "description": "Looking for error handling patterns"
    },
    {
        "query": "route decorator",
        "expected_keywords": ["route", "decorator", "path", "endpoint"],
        "description": "Developer needs routing functionality"
    },
    {
        "query": "database session",
        "expected_keywords": ["database", "session", "db", "connection"],
        "description": "Working with database sessions"
    },
]


def score_results(results: List[Dict], expected_keywords: List[str]) -> Tuple[float, int, bool]:
    """
    Score search results based on expected keywords
    Returns: (score 0-10, matches count, is_test_in_top_3)
    """
    if not results:
        return 0.0, 0, False
    
    # combine text from top 3 results
    top_3_text = ""
    has_test_in_top_3 = False
    
    for r in results[:3]:
        name = r.get("name", "").lower()
        qualified = r.get("qualified_name", "").lower()
        summary = (r.get("summary") or "").lower()
        file_path = r.get("file_path", "").lower()
        
        top_3_text += f" {name} {qualified} {summary} "
        
        # check for test files
        if "test" in file_path or "test" in name:
            has_test_in_top_3 = True
    
    # count keyword matches
    matches = sum(1 for kw in expected_keywords if kw.lower() in top_3_text)
    score = min(10.0, (matches / len(expected_keywords)) * 10)
    
    return score, matches, has_test_in_top_3


async def run_benchmark(repo_id: str):
    """Run benchmark comparing V2 vs V3"""
    print("=" * 80)
    print("🧪 SEARCH V3 vs V2 BENCHMARK")
    print("=" * 80)
    print()
    
    indexer = OptimizedCodeIndexer()
    
    v2_scores = []
    v3_scores = []
    v2_times = []
    v3_times = []
    v2_test_count = 0
    v3_test_count = 0
    
    for tc in TEST_QUERIES:
        query = tc["query"]
        expected = tc["expected_keywords"]
        desc = tc["description"]
        
        print(f"📝 Query: \"{query}\"")
        print(f"   Scenario: {desc}")
        print()
        
        # V2 Search
        start = time.time()
        try:
            v2_results = await indexer.search_v2(
                query=query,
                repo_id=repo_id,
                top_k=5,
                use_reranking=True
            )
            v2_time = (time.time() - start) * 1000
        except Exception as e:
            print(f"   ❌ V2 Error: {e}")
            v2_results = []
            v2_time = 0
        
        v2_score, v2_matches, v2_has_test = score_results(v2_results, expected)
        v2_scores.append(v2_score)
        v2_times.append(v2_time)
        if v2_has_test:
            v2_test_count += 1
        
        # V3 Search
        start = time.time()
        try:
            v3_results = await indexer.search_v3(
                query=query,
                repo_id=repo_id,
                top_k=5,
                include_tests=False,
                use_reranking=True
            )
            v3_time = (time.time() - start) * 1000
        except Exception as e:
            print(f"   ❌ V3 Error: {e}")
            v3_results = []
            v3_time = 0
        
        v3_score, v3_matches, v3_has_test = score_results(v3_results, expected)
        v3_scores.append(v3_score)
        v3_times.append(v3_time)
        if v3_has_test:
            v3_test_count += 1
        
        # Print comparison
        print(f"   V2: Score {v2_score:.1f}/10 ({v2_matches}/{len(expected)} keywords) | {v2_time:.0f}ms")
        if v2_results:
            print(f"       Top result: {v2_results[0].get('name', 'unknown')}")
        
        print(f"   V3: Score {v3_score:.1f}/10 ({v3_matches}/{len(expected)} keywords) | {v3_time:.0f}ms")
        if v3_results:
            print(f"       Top result: {v3_results[0].get('name', 'unknown')}")
        
        # Winner
        if v3_score > v2_score:
            print(f"   🏆 V3 WINS (+{v3_score - v2_score:.1f})")
        elif v2_score > v3_score:
            print(f"   🏆 V2 WINS (+{v2_score - v3_score:.1f})")
        else:
            print(f"   🤝 TIE")
        
        print()
    
    # Summary
    print("=" * 80)
    print("📊 BENCHMARK RESULTS")
    print("=" * 80)
    
    v2_avg = sum(v2_scores) / len(v2_scores)
    v3_avg = sum(v3_scores) / len(v3_scores)
    v2_total_time = sum(v2_times)
    v3_total_time = sum(v3_times)
    
    v2_wins = sum(1 for v2, v3 in zip(v2_scores, v3_scores) if v2 > v3)
    v3_wins = sum(1 for v2, v3 in zip(v2_scores, v3_scores) if v3 > v2)
    ties = len(v2_scores) - v2_wins - v3_wins
    
    print(f"""
┌─────────────────────────────────────────────────────────┐
│ METRIC                    │    V2     │    V3     │     │
├─────────────────────────────────────────────────────────┤
│ Average Score             │ {v2_avg:>6.1f}/10 │ {v3_avg:>6.1f}/10 │ {"V3 ✓" if v3_avg > v2_avg else "V2 ✓" if v2_avg > v3_avg else "TIE":<5}│
│ Total Time                │ {v2_total_time:>6.0f}ms │ {v3_total_time:>6.0f}ms │ {"V3 ✓" if v3_total_time < v2_total_time else "V2 ✓":<5}│
│ Queries with test in top3 │ {v2_test_count:>6}   │ {v3_test_count:>6}   │ {"V3 ✓" if v3_test_count < v2_test_count else "V2 ✓" if v2_test_count < v3_test_count else "TIE":<5}│
│ Wins                      │ {v2_wins:>6}   │ {v3_wins:>6}   │     │
│ Ties                      │ {ties:>6}   │ {ties:>6}   │     │
└─────────────────────────────────────────────────────────┘
    """)
    
    # Final verdict
    print()
    if v3_avg >= v2_avg + 1.0:
        print("✅ VERDICT: V3 is SIGNIFICANTLY BETTER - Ready for production!")
    elif v3_avg > v2_avg:
        print("✅ VERDICT: V3 is BETTER - Consider shipping!")
    elif v3_avg == v2_avg:
        print("⚠️ VERDICT: V3 is EQUAL to V2 - Need more optimization")
    else:
        print("❌ VERDICT: V3 is WORSE than V2 - Needs more work")
    
    print()
    
    # Check for Voyage
    try:
        from services.search_v3.integration import get_search_v3
        v3 = get_search_v3()
        if v3.is_voyage_enabled:
            print("🚀 Using Voyage AI code-specific embeddings")
        else:
            print("⚠️ Voyage AI not enabled - using OpenAI embeddings")
            print("   Set VOYAGE_API_KEY for better code search accuracy!")
    except:
        pass


if __name__ == "__main__":
    # default repo ID (starlette) - change as needed
    REPO_ID = os.getenv("BENCHMARK_REPO_ID", "0323a08f-9d21-4c59-b567-e0629a9bbb24")
    
    print(f"Using repo_id: {REPO_ID}")
    print("Set BENCHMARK_REPO_ID env var to use a different repo")
    print()
    
    asyncio.run(run_benchmark(REPO_ID))
