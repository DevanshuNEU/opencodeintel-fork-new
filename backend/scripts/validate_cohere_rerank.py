#!/usr/bin/env python3
"""
Phase 3: Cohere Reranking Validation Test
Compare V3 with reranking ON vs OFF
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# load env
try:
    with open('.env', 'r') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                key, val = line.strip().split('=', 1)
                os.environ[key] = val
except:
    pass

from services.indexer_optimized import OptimizedCodeIndexer

QUERIES = [
    "authentication",
    "how to return json",
    "handle errors",
    "middleware",
    "websocket connection",
    "static files",
    "request body",
    "redirect response",
]

repo_id = "0323a08f-9d21-4c59-b567-e0629a9bbb24"  # starlette


def has_test_in_top3(results):
    for r in results[:3]:
        fp = r.get("file_path", "").lower()
        if "test" in fp:
            return True
    return False


def score_results(results, query):
    """Simple relevance scoring based on name/file matching query terms"""
    if not results:
        return 0
    
    score = 0
    terms = query.lower().split()
    
    for i, r in enumerate(results[:5]):
        name = r.get("name", "").lower()
        file_path = r.get("file_path", "").lower()
        
        # penalize test files heavily
        if "test" in file_path:
            score -= (5 - i)
            continue
        
        # reward matches
        for term in terms:
            if term in name:
                score += (5 - i) * 2
            if term in file_path:
                score += (5 - i)
    
    return max(0, score)


async def run_validation():
    print("=" * 70)
    print("🧪 COHERE RERANKING VALIDATION TEST")
    print("=" * 70)
    print()
    
    indexer = OptimizedCodeIndexer()
    
    # check if Cohere is working
    from services.search_v3.integration import get_search_v3
    v3 = get_search_v3()
    v3._ensure_initialized()
    has_cohere = v3._search_engine.cohere_client is not None
    print(f"Cohere Status: {'✅ ENABLED' if has_cohere else '❌ DISABLED'}")
    print()
    
    if not has_cohere:
        print("⚠️ Cohere not available - cannot test reranking")
        return
    
    # test with reranking ON vs OFF
    rerank_on_score = 0
    rerank_off_score = 0
    rerank_on_tests = 0
    rerank_off_tests = 0
    
    for query in QUERIES:
        print(f"📝 \"{query}\"")
        
        # V3 with reranking OFF
        try:
            results_off = await indexer.search_v3(
                query, repo_id, top_k=5, 
                include_tests=False,
                use_reranking=False  # disable reranking
            )
            off_score = score_results(results_off, query)
            off_test = has_test_in_top3(results_off)
            off_top = results_off[0].get("name", "?")[:25] if results_off else "none"
        except Exception as e:
            print(f"   ❌ OFF error: {e}")
            off_score, off_test, off_top = 0, False, "error"
            results_off = []
        
        # V3 with reranking ON
        try:
            results_on = await indexer.search_v3(
                query, repo_id, top_k=5,
                include_tests=False,
                use_reranking=True  # enable reranking
            )
            on_score = score_results(results_on, query)
            on_test = has_test_in_top3(results_on)
            on_top = results_on[0].get("name", "?")[:25] if results_on else "none"
            
            # show rerank scores if available
            if results_on and 'rerank_score' in results_on[0]:
                top_rerank = results_on[0].get('rerank_score', 0)
                print(f"   Cohere relevance: {top_rerank:.3f}")
        except Exception as e:
            print(f"   ❌ ON error: {e}")
            on_score, on_test, on_top = 0, False, "error"
            results_on = []
        
        rerank_off_score += off_score
        rerank_on_score += on_score
        if off_test: rerank_off_tests += 1
        if on_test: rerank_on_tests += 1
        
        # determine winner
        if on_score > off_score:
            winner = "RERANK ✓"
        elif off_score > on_score:
            winner = "NO-RERANK"
        else:
            winner = "TIE"
        
        off_marker = "❌" if off_test else "✅"
        on_marker = "❌" if on_test else "✅"
        
        print(f"   OFF: {off_marker} {off_top:<25} (score={off_score})")
        print(f"   ON:  {on_marker} {on_top:<25} (score={on_score})")
        print(f"   Winner: {winner}")
        print()
    
    # Summary
    print("=" * 70)
    print("📊 RERANKING IMPACT SUMMARY")
    print("=" * 70)
    print(f"""
    Metric                    Rerank OFF     Rerank ON     Better?
    ──────────────────────────────────────────────────────────────
    Total Score               {rerank_off_score:>10}     {rerank_on_score:>10}     {"✅ ON" if rerank_on_score > rerank_off_score else "❌ OFF"}
    Test Pollution            {rerank_off_tests:>10}     {rerank_on_tests:>10}     {"✅ ON" if rerank_on_tests < rerank_off_tests else "TIE" if rerank_on_tests == rerank_off_tests else "❌ OFF"}
    """)
    
    improvement = ((rerank_on_score - rerank_off_score) / max(rerank_off_score, 1)) * 100
    print(f"    Reranking improvement: {improvement:+.0f}%")
    print()
    
    if rerank_on_score >= rerank_off_score and rerank_on_tests <= rerank_off_tests:
        print("✅ COHERE RERANKING IS WORKING AND IMPROVING RESULTS!")
    else:
        print("⚠️ Reranking needs tuning")


if __name__ == "__main__":
    asyncio.run(run_validation())
