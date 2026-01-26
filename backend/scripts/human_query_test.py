#!/usr/bin/env python3
"""
Real-World Human Query Test - V2 vs V3
Tests with queries that REAL developers would actually type
"""
import asyncio
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load from environment (set in .env or export manually)
if not os.environ.get("VOYAGE_API_KEY"):
    print("❌ VOYAGE_API_KEY not set. Export it or add to .env file.")
    sys.exit(1)

from services.indexer_optimized import OptimizedCodeIndexer

# Real human queries - how developers ACTUALLY search
HUMAN_QUERIES = [
    {
        "query": "authentication",
        "what_user_wants": "Auth middleware/decorators",
        "good_results": ["auth", "middleware", "authenticate", "login", "session"],
        "bad_results": ["test_", "_test", "mock", "fixture"],
    },
    {
        "query": "how do I return json",
        "what_user_wants": "JSONResponse or json return patterns",
        "good_results": ["json", "response", "jsonresponse", "return"],
        "bad_results": ["test_", "_test"],
    },
    {
        "query": "handle errors",
        "what_user_wants": "Error handlers, exception handling",
        "good_results": ["error", "exception", "handler", "catch"],
        "bad_results": ["test_error", "mock"],
    },
    {
        "query": "websocket",
        "what_user_wants": "WebSocket connection handling",
        "good_results": ["websocket", "socket", "ws", "connect"],
        "bad_results": ["test_websocket"],
    },
    {
        "query": "middleware",
        "what_user_wants": "Middleware classes/functions",
        "good_results": ["middleware", "dispatch", "call_next"],
        "bad_results": ["test_middleware"],
    },
    {
        "query": "request body",
        "what_user_wants": "How to read request body/data",
        "good_results": ["request", "body", "data", "json", "form"],
        "bad_results": ["test_request"],
    },
    {
        "query": "routing",
        "what_user_wants": "Route definitions, URL patterns",
        "good_results": ["route", "router", "path", "endpoint", "url"],
        "bad_results": ["test_route"],
    },
    {
        "query": "static files",
        "what_user_wants": "Serving static files",
        "good_results": ["static", "file", "serve", "mount"],
        "bad_results": ["test_static"],
    },
]


def score_result(result, good_keywords, bad_keywords):
    """Score a single result"""
    name = result.get("name", "").lower()
    file_path = result.get("file_path", "").lower()
    qualified = result.get("qualified_name", "").lower()
    text = f"{name} {file_path} {qualified}"
    
    # Check for bad results (test files)
    for bad in bad_keywords:
        if bad in text:
            return -1, "test_file"
    
    # Check for good results
    matches = sum(1 for good in good_keywords if good in text)
    return matches, "ok"


def evaluate_results(results, query_info):
    """Evaluate search results quality"""
    if not results:
        return {"score": 0, "reason": "no_results", "top_3": []}
    
    good = query_info["good_results"]
    bad = query_info["bad_results"]
    
    total_score = 0
    test_files_in_top_3 = 0
    top_3 = []
    
    for i, r in enumerate(results[:5]):  # Check top 5
        match_score, status = score_result(r, good, bad)
        
        if i < 3:  # Track top 3
            top_3.append({
                "name": r.get("name", "?"),
                "file": r.get("file_path", "?").split("/")[-1],
                "score": r.get("score", 0),
                "is_test": status == "test_file"
            })
            
            if status == "test_file":
                test_files_in_top_3 += 1
        
        # Weight by position (position 1 = 5pts, position 5 = 1pt)
        position_weight = 6 - (i + 1)
        
        if status == "test_file":
            total_score -= position_weight  # Penalty for test files
        else:
            total_score += match_score * position_weight
    
    return {
        "score": max(0, total_score),
        "test_files_in_top_3": test_files_in_top_3,
        "top_3": top_3
    }


async def run_comparison():
    print("=" * 80)
    print("🧪 REAL HUMAN QUERY TEST: V2 vs V3 (with Voyage AI)")
    print("=" * 80)
    print()
    
    indexer = OptimizedCodeIndexer()
    
    # Use starlette repo
    repo_id = "0323a08f-9d21-4c59-b567-e0629a9bbb24"
    
    v2_total = 0
    v3_total = 0
    v2_test_pollution = 0
    v3_test_pollution = 0
    
    results_table = []
    
    for q in HUMAN_QUERIES:
        query = q["query"]
        print(f"🔍 Query: \"{query}\"")
        print(f"   User wants: {q['what_user_wants']}")
        
        # V2
        start = time.time()
        try:
            v2_results = await indexer.search_v2(query, repo_id, top_k=5)
            v2_time = (time.time() - start) * 1000
        except Exception as e:
            print(f"   V2 Error: {e}")
            v2_results = []
            v2_time = 0
        
        v2_eval = evaluate_results(v2_results, q)
        
        # V3
        start = time.time()
        try:
            v3_results = await indexer.search_v3(query, repo_id, top_k=5, include_tests=False)
            v3_time = (time.time() - start) * 1000
        except Exception as e:
            print(f"   V3 Error: {e}")
            v3_results = []
            v3_time = 0
        
        v3_eval = evaluate_results(v3_results, q)
        
        # Compare
        v2_total += v2_eval["score"]
        v3_total += v3_eval["score"]
        v2_test_pollution += v2_eval.get("test_files_in_top_3", 0)
        v3_test_pollution += v3_eval.get("test_files_in_top_3", 0)
        
        # Print results
        print(f"\n   V2 (OpenAI): Score={v2_eval['score']:>2} | {v2_time:>4.0f}ms | Tests in top3: {v2_eval.get('test_files_in_top_3', 0)}")
        for r in v2_eval["top_3"]:
            marker = "❌" if r["is_test"] else "✅"
            print(f"      {marker} {r['name'][:30]:<30} ({r['file'][:25]})")
        
        print(f"\n   V3 (Voyage): Score={v3_eval['score']:>2} | {v3_time:>4.0f}ms | Tests in top3: {v3_eval.get('test_files_in_top_3', 0)}")
        for r in v3_eval["top_3"]:
            marker = "❌" if r["is_test"] else "✅"
            print(f"      {marker} {r['name'][:30]:<30} ({r['file'][:25]})")
        
        # Winner
        if v3_eval["score"] > v2_eval["score"]:
            print(f"\n   🏆 V3 WINS (+{v3_eval['score'] - v2_eval['score']})")
        elif v2_eval["score"] > v3_eval["score"]:
            print(f"\n   🏆 V2 WINS (+{v2_eval['score'] - v3_eval['score']})")
        else:
            print(f"\n   🤝 TIE")
        
        results_table.append({
            "query": query,
            "v2_score": v2_eval["score"],
            "v3_score": v3_eval["score"],
            "v2_tests": v2_eval.get("test_files_in_top_3", 0),
            "v3_tests": v3_eval.get("test_files_in_top_3", 0),
        })
        
        print()
        print("-" * 80)
        print()
    
    # Final Summary
    print()
    print("=" * 80)
    print("📊 FINAL RESULTS")
    print("=" * 80)
    
    v2_wins = sum(1 for r in results_table if r["v2_score"] > r["v3_score"])
    v3_wins = sum(1 for r in results_table if r["v3_score"] > r["v2_score"])
    ties = len(results_table) - v2_wins - v3_wins
    
    print(f"""
┌────────────────────────────────────────────────────────────────┐
│                    V2 (OpenAI)    V3 (Voyage)    WINNER        │
├────────────────────────────────────────────────────────────────┤
│ Total Score            {v2_total:>4}           {v3_total:>4}         {"V3 ✓" if v3_total > v2_total else "V2 ✓" if v2_total > v3_total else "TIE":<10}   │
│ Test Files in Top 3    {v2_test_pollution:>4}           {v3_test_pollution:>4}         {"V3 ✓" if v3_test_pollution < v2_test_pollution else "V2 ✓" if v2_test_pollution < v3_test_pollution else "TIE":<10}   │
│ Query Wins             {v2_wins:>4}           {v3_wins:>4}         {"V3 ✓" if v3_wins > v2_wins else "V2 ✓" if v2_wins > v3_wins else "TIE":<10}   │
│ Ties                   {ties:>4}           {ties:>4}                      │
└────────────────────────────────────────────────────────────────┘
    """)
    
    # Per-query breakdown
    print("\nPer-Query Breakdown:")
    print(f"{'Query':<20} {'V2':>6} {'V3':>6} {'Winner':>10}")
    print("-" * 45)
    for r in results_table:
        winner = "V3" if r["v3_score"] > r["v2_score"] else "V2" if r["v2_score"] > r["v3_score"] else "TIE"
        print(f"{r['query']:<20} {r['v2_score']:>6} {r['v3_score']:>6} {winner:>10}")
    
    # Final verdict
    print()
    if v3_total > v2_total * 1.2:  # 20% better
        print("✅ VERDICT: V3 is SIGNIFICANTLY BETTER - Ship it! 🚀")
    elif v3_total > v2_total:
        print("✅ VERDICT: V3 is BETTER - Ready to ship!")
    elif v3_total == v2_total:
        print("⚠️ VERDICT: V3 is EQUAL to V2")
    else:
        print("❌ VERDICT: V3 needs more work")
    
    if v3_test_pollution < v2_test_pollution:
        print(f"✅ V3 has {v2_test_pollution - v3_test_pollution} fewer test files polluting results!")


if __name__ == "__main__":
    asyncio.run(run_comparison())
