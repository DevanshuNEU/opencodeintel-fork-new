#!/usr/bin/env python3
"""
Extended Search V3 Testing Suite
More human-like queries across different patterns
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["VOYAGE_API_KEY"] = "pa-LPXoLbJ3W-S01F70zQsHcRFUTPXZ52dZ3d9PrXnxm7A"

from services.indexer_optimized import OptimizedCodeIndexer

# More natural human queries - how devs ACTUALLY search
EXTENDED_QUERIES = [
    # Natural language questions
    {"query": "how to send a response", "wants": "Response classes"},
    {"query": "validate input", "wants": "Input validation"},
    {"query": "cookies", "wants": "Cookie handling"},
    {"query": "session management", "wants": "Session handling"},
    {"query": "cors", "wants": "CORS middleware"},
    
    # Typos and variations  
    {"query": "http request", "wants": "Request handling"},
    {"query": "url parameters", "wants": "Path/query params"},
    {"query": "background tasks", "wants": "BackgroundTask class"},
    
    # Implementation patterns
    {"query": "async function", "wants": "Async handlers"},
    {"query": "decorator", "wants": "Route decorators"},
    {"query": "exception", "wants": "Exception classes"},
    
    # Specific features
    {"query": "file upload", "wants": "File handling"},
    {"query": "template", "wants": "Template rendering"},
    {"query": "redirect", "wants": "Redirect responses"},
    {"query": "headers", "wants": "Header handling"},
]


async def run_extended_tests():
    print("=" * 70)
    print("🧪 EXTENDED V3 TESTING - More Human Queries")
    print("=" * 70)
    print()
    
    indexer = OptimizedCodeIndexer()
    repo_id = "0323a08f-9d21-4c59-b567-e0629a9bbb24"  # starlette
    
    v2_wins = 0
    v3_wins = 0
    ties = 0
    v2_test_pollution = 0
    v3_test_pollution = 0
    
    for q in EXTENDED_QUERIES:
        query = q["query"]
        wants = q["wants"]
        
        # V2
        try:
            v2_results = await indexer.search_v2(query, repo_id, top_k=3)
        except:
            v2_results = []
        
        # V3
        try:
            v3_results = await indexer.search_v3(query, repo_id, top_k=3, include_tests=False)
        except:
            v3_results = []
        
        # Check for test files in top 3
        v2_tests = sum(1 for r in v2_results[:3] if "test" in r.get("file_path", "").lower())
        v3_tests = sum(1 for r in v3_results[:3] if "test" in r.get("file_path", "").lower())
        v2_test_pollution += v2_tests
        v3_test_pollution += v3_tests
        
        # Simple scoring: penalize test files heavily
        v2_score = len(v2_results) - (v2_tests * 2)
        v3_score = len(v3_results) - (v3_tests * 2)
        
        if v3_score > v2_score:
            v3_wins += 1
            winner = "V3 ✓"
        elif v2_score > v3_score:
            v2_wins += 1
            winner = "V2 ✓"
        else:
            ties += 1
            winner = "TIE"
        
        # Print results
        v2_top = v2_results[0].get("name", "?")[:25] if v2_results else "none"
        v3_top = v3_results[0].get("name", "?")[:25] if v3_results else "none"
        v2_file = v2_results[0].get("file_path", "").split("/")[-1][:20] if v2_results else ""
        v3_file = v3_results[0].get("file_path", "").split("/")[-1][:20] if v3_results else ""
        
        test_marker_v2 = "❌" if v2_tests > 0 else "✅"
        test_marker_v3 = "❌" if v3_tests > 0 else "✅"
        
        print(f"🔍 \"{query}\" (wants: {wants})")
        print(f"   V2: {test_marker_v2} {v2_top:<25} ({v2_file})")
        print(f"   V3: {test_marker_v3} {v3_top:<25} ({v3_file})")
        print(f"   Winner: {winner}")
        print()
    
    # Summary
    print("=" * 70)
    print("📊 EXTENDED TEST RESULTS")
    print("=" * 70)
    print(f"""
    V2 Wins:              {v2_wins}
    V3 Wins:              {v3_wins}
    Ties:                 {ties}
    
    V2 Test Pollution:    {v2_test_pollution} test files in results
    V3 Test Pollution:    {v3_test_pollution} test files in results
    
    V3 Win Rate:          {v3_wins}/{len(EXTENDED_QUERIES)} = {v3_wins/len(EXTENDED_QUERIES)*100:.0f}%
    """)
    
    if v3_wins > v2_wins:
        print("✅ V3 WINS EXTENDED TESTING!")
    elif v2_wins > v3_wins:
        print("❌ V2 performed better - needs investigation")
    else:
        print("🤝 TIE - V3 matches V2")


if __name__ == "__main__":
    asyncio.run(run_extended_tests())
