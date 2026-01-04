"""Hybrid search with BM25 + semantic fusion and Cohere reranking."""
import os
from typing import List, Dict, Optional
from dataclasses import dataclass

import cohere
from rank_bm25 import BM25Okapi

from services.search_v2.types import SearchResult
from services.observability import logger


@dataclass
class ScoredResult:
    """Intermediate result with multiple scores."""
    metadata: Dict
    semantic_score: float = 0.0
    bm25_score: float = 0.0
    rerank_score: float = 0.0
    fused_score: float = 0.0


class HybridSearcher:
    """Combines BM25 keyword search with semantic search and reranking."""

    def __init__(
        self,
        pinecone_index,
        embedding_fn,
        cohere_api_key: Optional[str] = None,
        rerank_model: str = "rerank-v3.5",
    ):
        self.index = pinecone_index
        self.embed = embedding_fn
        self.rerank_model = rerank_model

        api_key = cohere_api_key or os.getenv("COHERE_API_KEY")
        self.cohere = cohere.Client(api_key) if api_key else None

        if not self.cohere:
            logger.warning("Cohere API key not set, reranking disabled")

    async def search(
        self,
        query: str,
        repo_id: str,
        top_k: int = 10,
        semantic_weight: float = 0.7,
        bm25_weight: float = 0.3,
        use_reranking: bool = True,
    ) -> List[SearchResult]:
        """
        Hybrid search with optional reranking.

        1. Fetch candidates via semantic search (top 50)
        2. Apply BM25 scoring on candidates
        3. Fuse scores using RRF
        4. Rerank top results with Cohere
        """
        # get semantic candidates
        candidates = await self._semantic_search(query, repo_id, top_k=50)
        if not candidates:
            return []

        # apply bm25 on candidates
        candidates = self._apply_bm25(query, candidates)

        # fuse scores
        candidates = self._rrf_fusion(candidates, semantic_weight, bm25_weight)

        # sort by fused score
        candidates.sort(key=lambda x: x.fused_score, reverse=True)

        # rerank top results
        top_candidates = candidates[:top_k * 2]
        if use_reranking and self.cohere:
            top_candidates = await self._rerank(query, top_candidates)

        # convert to SearchResult
        return [self._to_search_result(c) for c in top_candidates[:top_k]]

    async def _semantic_search(self, query: str, repo_id: str, top_k: int) -> List[ScoredResult]:
        """Fetch candidates from Pinecone."""
        query_embedding = await self.embed(query)

        results = self.index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True,
            filter={"repo_id": {"$eq": repo_id}}
        )

        return [
            ScoredResult(
                metadata=match.metadata,
                semantic_score=match.score,
            )
            for match in results.matches
        ]

    def _apply_bm25(self, query: str, candidates: List[ScoredResult]) -> List[ScoredResult]:
        """Score candidates with BM25."""
        if not candidates:
            return candidates

        # build corpus from candidates
        corpus = []
        for c in candidates:
            text = f"{c.metadata.get('name', '')} {c.metadata.get('qualified_name', '')} "
            text += f"{c.metadata.get('signature', '')} {c.metadata.get('docstring', '')} "
            text += c.metadata.get('summary', '')
            corpus.append(text.lower().split())

        bm25 = BM25Okapi(corpus)
        query_tokens = query.lower().split()
        scores = bm25.get_scores(query_tokens)

        # normalize scores
        max_score = max(scores) if max(scores) > 0 else 1
        for i, c in enumerate(candidates):
            c.bm25_score = scores[i] / max_score

        return candidates

    def _rrf_fusion(
        self,
        candidates: List[ScoredResult],
        semantic_weight: float,
        bm25_weight: float,
        k: int = 60
    ) -> List[ScoredResult]:
        """Reciprocal Rank Fusion."""
        # sort by semantic for ranking
        by_semantic = sorted(candidates, key=lambda x: x.semantic_score, reverse=True)
        for rank, c in enumerate(by_semantic):
            c.fused_score = semantic_weight / (k + rank + 1)

        # sort by bm25 for ranking
        by_bm25 = sorted(candidates, key=lambda x: x.bm25_score, reverse=True)
        for rank, c in enumerate(by_bm25):
            c.fused_score += bm25_weight / (k + rank + 1)

        return candidates

    async def _rerank(self, query: str, candidates: List[ScoredResult]) -> List[ScoredResult]:
        """Rerank with Cohere."""
        if not candidates:
            return candidates

        docs = []
        for c in candidates:
            doc = f"{c.metadata.get('qualified_name', '')}: {c.metadata.get('summary', '')}"
            if not c.metadata.get('summary'):
                doc = f"{c.metadata.get('qualified_name', '')}: {c.metadata.get('signature', '')}"
            docs.append(doc)

        try:
            response = self.cohere.rerank(
                query=query,
                documents=docs,
                model=self.rerank_model,
                top_n=len(candidates),
            )

            reranked = []
            for r in response.results:
                c = candidates[r.index]
                c.rerank_score = r.relevance_score
                reranked.append(c)

            return reranked

        except Exception as e:
            logger.warning("Reranking failed", error=str(e))
            return candidates

    def _to_search_result(self, scored: ScoredResult) -> SearchResult:
        """Convert to SearchResult."""
        m = scored.metadata
        return SearchResult(
            name=m.get("name", ""),
            qualified_name=m.get("qualified_name", ""),
            file_path=m.get("file_path", ""),
            code=m.get("code", ""),
            signature=m.get("signature", ""),
            language=m.get("language", ""),
            score=scored.rerank_score if scored.rerank_score else scored.fused_score,
            start_line=m.get("start_line", 0),
            end_line=m.get("end_line", 0),
            summary=m.get("summary"),
            class_name=m.get("class_name"),
        )
