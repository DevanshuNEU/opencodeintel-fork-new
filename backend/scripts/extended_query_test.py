#!/usr/bin/env python3
"""
Extended Human Query Test - More realistic developer queries
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

# More realistic queries developers would type
EXTENDED_QUERIES = [
    # Natural language questions
    {"query": "how to validate input", "wants": "validation logic", "good": ["valid", "check", "schema"], "bad": ["test_"]},
    {"query": "send response to client", "wants": "response handling", "good": ["response", "send", "return"], "bad": ["test_"]},
    {"query": "parse cookies", "wants": "cookie handling", "good": ["cookie", "parse", "get"], "bad": ["test_"]},
    {"query": "handle file uploads", "wants": "file upload logic", "good": ["file", "upload", "form", "multipart"], "bad": ["test_"]},
    {"query": "cors settings", "wants": "CORS middleware", "good": ["cors", "origin", "header"], "bad": ["test_"]},
    
    # Short keyword searches
    {"query": "session", "wants": "session management", "good": ["session"], "bad": ["test_session"]},
    {"query": "redirect", "wants": "redirect response", "good": ["redirect", "location"], "bad": ["test_redirect"]},
    {"query": "template", "wants": "template rendering", "good": ["template", "render", "jinja"], "bad": ["test_template"]},
    {"query": "background task", "wants": "async background tasks", "good": ["background", "task", "async"], "bad": ["test_"]},
    {"query": "lifespan", "wants": "app lifespan events", "good": ["lifespan", "startup", "shutdown"], "bad": ["test_"]},
    
    # Specific patterns
    {"query": "404 not found", "wants": "404 error handling", "good": ["404", "not_found", "notfound"], "bad": ["test_"]},
    {"query": "rate limit", "wants": "rate limiting", "good": ["rate", "limit", "throttle"], "bad": ["test_"]},
    {"query": "database connection", "wants": "DB connection", "good": ["database", "db", "connection", "pool"], "bad": ["test_"]},
    {"query": "form data", "wants": "form parsing", "good": ["form", "data", "parse", "multipart"], "bad": ["test_"]},
    {"query": "headers", "wants": "HTTP headers", "good": ["header", "headers"], "bad": ["test_header"]},
]


def score_result(result, good_keywords, bad_keywords):
    name = result.get("name", "").lower()
    file_path = result.get("file_path", "").lower()
    qualified = result.get("qualified_name", "").lower()
    text = f"{name} {file_path} {qualified}"
    
    for bad in bad_keywords:
        if bad in text:
            return -1, True
    
    matches = sum(1 for good in good_keywords if good in text)
    return matches, False


def evaluate_results(results, query_info):
    if not results:
        return {"score": 0, "test_count": 0, "top_3": []}
    
    good = query_info["good"]
    bad = query_info["bad"]
    
    total_score = 0
    test_count = 0
    top_3 = []
    
    for i, r in enumerate(results[:5]):
        match_score, is_test = score_result(r, good, bad)
        
        if i < 3:
            top_3.append({
                "name": r.get("name", "?")[:25],
                "file": r.get("file_path", "?").split("/")[-1][:20],
                "is_test": is_test
            })
            if is_test:
                test_count += 1
        
        position_weight = 6 - (i + 1)
        if is_test:
            total_score -= position_weight
        else:
            total_score += match_score * position_weight
    
    return {"score": max(0, total_score), "test_count": test_count, "top_3": top_3}


async def run_extended_test():
    print("=" * 70)
    print("🧪 EXTENDED HUMAN QUERY TEST - V2 vs V3")
    print("=" * 70)
    print()
    
    indexer = OptimizedCodeIndexer()
    repo_id = "0323a08f-9d21-4c59-b567-e0629a9bbb24"  # starlette
    
    v2_total, v3_total = 0, 0
    v2_tests, v3_tests = 0, 0
    v2_wins, v3_wins, ties = 0, 0, 0
    
    for q in EXTENDED_QUERIES:
        query = q["query"]
        
        # V2
        try:
            v2_results = await indexer.search_v2(query, repo_id, top_k=5)
        except Exception as e:
            print(f"  V2 error for '{query}': {e}")
            v2_results = []
        v2_eval = evaluate_results(v2_results, q)
        
        # V3
        try:
            v3_results = await indexer.search_v3(query, repo_id, top_k=5, include_tests=False)
        except Exception as e:
            print(f"  V3 error for '{query}': {e}")
            v3_results = []
        v3_eval = evaluate_results(v3_results, q)
        
        v2_total += v2_eval["score"]
        v3_total += v3_eval["score"]
        v2_tests += v2_eval["test_count"]
        v3_tests += v3_eval["test_count"]
        
        if v3_eval["score"] > v2_eval["score"]:
            winner = "V3 ✓"
            v3_wins += 1
        elif v2_eval["score"] > v3_eval["score"]:
            winner = "V2 ✓"
            v2_wins += 1
        else:
            winner = "TIE"
            ties += 1
        
        # Compact output
        print(f"📝 \"{query}\"")
        print(f"   V2: {v2_eval['score']:>2} | V3: {v3_eval['score']:>2} | {winner}")
        
        # Show top result comparison
        v2_top = v2_eval["top_3"][0] if v2_eval["top_3"] else {"name": "-", "is_test": False}
        v3_top = v3_eval["top_3"][0] if v3_eval["top_3"] else {"name": "-", "is_test": False}
        v2_marker = "❌" if v2_top.get("is_test") else "✅"
        v3_marker = "❌" if v3_top.get("is_test") else "✅"
        print(f"   V2 top: {v2_marker} {v2_top['name']}")
        print(f"   V3 top: {v3_marker} {v3_top['name']}")
        print()
    
    # Summary
    print("=" * 70)
    print("📊 EXTENDED TEST RESULTS")
    print("=" * 70)
    print(f"""
    Metric              V2          V3          Winner
    ─────────────────────────────────────────────────────
    Total Score         {v2_total:>3}         {v3_total:>3}         {"V3 ✓" if v3_total > v2_total else "V2 ✓" if v2_total > v3_total else "TIE"}
    Test Pollution      {v2_tests:>3}         {v3_tests:>3}         {"V3 ✓" if v3_tests < v2_tests else "V2 ✓" if v2_tests < v3_tests else "TIE"}
    Queries Won         {v2_wins:>3}         {v3_wins:>3}
    Ties                {ties:>3}         {ties:>3}
    """)
    
    improvement = ((v3_total - v2_total) / max(v2_total, 1)) * 100
    print(f"    V3 improvement: {improvement:.0f}%")
    print()
    
    if v3_total > v2_total * 1.2:
        print("✅ V3 SIGNIFICANTLY BETTER!")
    elif v3_total > v2_total:
        print("✅ V3 is better")
    else:
        print("⚠️ Results inconclusive")


if __name__ == "__main__":
    asyncio.run(run_extended_test())
