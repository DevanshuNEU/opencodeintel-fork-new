#!/usr/bin/env python3
"""
Cross-Repo Test - Test V3 on multiple repositories
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["VOYAGE_API_KEY"] = "pa-LPXoLbJ3W-S01F70zQsHcRFUTPXZ52dZ3d9PrXnxm7A"

from services.indexer_optimized import OptimizedCodeIndexer

REPOS = [
    {"id": "b0d22b4c-9d05-426e-8d9c-7278cce0f4c7", "name": "Flask"},
    {"id": "778333ff-6532-4c05-b73a-d54d44c6917d", "name": "Jotai"},
    {"id": "409fbeac-376f-4593-99a2-882d74e2cae6", "name": "Bun"},
]

QUERIES = [
    {"query": "routing", "good": ["route", "router", "path", "url"]},
    {"query": "middleware", "good": ["middleware", "dispatch", "handler"]},
    {"query": "request", "good": ["request", "req"]},
    {"query": "response", "good": ["response", "res", "reply"]},
    {"query": "error handling", "good": ["error", "exception", "handler"]},
]


def has_test_in_top3(results):
    for r in results[:3]:
        name = r.get("name", "").lower()
        file_path = r.get("file_path", "").lower()
        if "test" in name or "test" in file_path:
            return True
    return False


async def test_repo(indexer, repo):
    print(f"\n{'='*60}")
    print(f"📦 Testing: {repo['name']}")
    print(f"{'='*60}")
    
    v2_test_count = 0
    v3_test_count = 0
    v2_wins = 0
    v3_wins = 0
    
    for q in QUERIES:
        query = q["query"]
        
        try:
            v2_results = await indexer.search_v2(query, repo["id"], top_k=5)
            v2_has_test = has_test_in_top3(v2_results)
            v2_top = v2_results[0].get("name", "?")[:20] if v2_results else "-"
        except Exception as e:
            v2_has_test = False
            v2_top = f"error"
            v2_results = []
        
        try:
            v3_results = await indexer.search_v3(query, repo["id"], top_k=5, include_tests=False)
            v3_has_test = has_test_in_top3(v3_results)
            v3_top = v3_results[0].get("name", "?")[:20] if v3_results else "-"
        except Exception as e:
            v3_has_test = False
            v3_top = f"error"
            v3_results = []
        
        if v2_has_test:
            v2_test_count += 1
        if v3_has_test:
            v3_test_count += 1
        
        # Simple win: no test pollution = better
        if not v3_has_test and v2_has_test:
            v3_wins += 1
            winner = "V3"
        elif not v2_has_test and v3_has_test:
            v2_wins += 1
            winner = "V2"
        else:
            winner = "TIE"
        
        v2_marker = "❌" if v2_has_test else "✅"
        v3_marker = "❌" if v3_has_test else "✅"
        
        print(f"  \"{query}\"")
        print(f"    V2: {v2_marker} {v2_top:<20} | V3: {v3_marker} {v3_top:<20} | {winner}")
    
    print(f"\n  Summary: V2 test pollution={v2_test_count}, V3 test pollution={v3_test_count}")
    return {"v2_tests": v2_test_count, "v3_tests": v3_test_count, "v2_wins": v2_wins, "v3_wins": v3_wins}


async def main():
    print("🧪 CROSS-REPOSITORY TEST - V2 vs V3")
    
    indexer = OptimizedCodeIndexer()
    
    total_v2_tests = 0
    total_v3_tests = 0
    
    for repo in REPOS:
        try:
            result = await test_repo(indexer, repo)
            total_v2_tests += result["v2_tests"]
            total_v3_tests += result["v3_tests"]
        except Exception as e:
            print(f"  ⚠️ Error testing {repo['name']}: {e}")
    
    print(f"\n{'='*60}")
    print(f"📊 CROSS-REPO SUMMARY")
    print(f"{'='*60}")
    print(f"  Total V2 test pollution: {total_v2_tests}")
    print(f"  Total V3 test pollution: {total_v3_tests}")
    print(f"  V3 reduction: {total_v2_tests - total_v3_tests} fewer test files")
    
    if total_v3_tests < total_v2_tests:
        print(f"\n✅ V3 WINS across multiple repos!")
    else:
        print(f"\n⚠️ Results mixed")


if __name__ == "__main__":
    asyncio.run(main())
