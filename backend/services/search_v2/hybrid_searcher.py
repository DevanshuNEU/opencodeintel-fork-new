"""Hybrid search with BM25 + semantic fusion and Cohere reranking."""
import os
import re
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


def _split_camel_case(text: str) -> str:
    """Split CamelCase into separate words for better tokenization."""
    # AuthenticationMiddleware -> Authentication Middleware
    return re.sub(r'([a-z])([A-Z])', r'\1 \2', text)


def _tokenize(text: str) -> List[str]:
    """Tokenize text with camelCase splitting."""
    # split camelCase, then lowercase and split on whitespace/punctuation
    expanded = _split_camel_case(text)
    return re.findall(r'\w+', expanded.lower())


class HybridSearcher:
    """Combines BM25 keyword search with semantic search and reranking."""

    def __init__(
        self,
        pinecone_index,
        embedding_fn,
        cohere_api_key: Optional[str] = None,
        rerank_model: str = "rerank-v4.0-fast",
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
        candidates = await self._semantic_search(query, repo_id, top_k=50)
        if not candidates:
            return []

        candidates = self._apply_bm25(query, candidates)
        candidates = self._rrf_fusion(candidates, semantic_weight, bm25_weight)
        candidates.sort(key=lambda x: x.fused_score, reverse=True)

        top_candidates = candidates[:top_k * 2]
        if use_reranking and self.cohere:
            top_candidates = await self._rerank(query, top_candidates)

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
        """Score candidates with BM25 (with camelCase support)."""
        if not candidates:
            return candidates

        corpus = []
        for c in candidates:
            # build searchable text from all available metadata
            parts = [
                c.metadata.get('name', ''),
                c.metadata.get('qualified_name', ''),
                c.metadata.get('signature', ''),
                c.metadata.get('docstring', ''),
                c.metadata.get('summary', ''),
                c.metadata.get('type', ''),
            ]
            text = ' '.join(filter(None, parts))
            # tokenize with camelCase splitting
            corpus.append(_tokenize(text))

        bm25 = BM25Okapi(corpus)
        query_tokens = _tokenize(query)
        scores = bm25.get_scores(query_tokens)

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
        by_semantic = sorted(candidates, key=lambda x: x.semantic_score, reverse=True)
        for rank, c in enumerate(by_semantic):
            c.fused_score = semantic_weight / (k + rank + 1)

        by_bm25 = sorted(candidates, key=lambda x: x.bm25_score, reverse=True)
        for rank, c in enumerate(by_bm25):
            c.fused_score += bm25_weight / (k + rank + 1)

        return candidates

    async def _rerank(self, query: str, candidates: List[ScoredResult]) -> List[ScoredResult]:
        """Rerank with Cohere (backward compatible with V1 indexed data)."""
        if not candidates:
            return candidates

        docs = []
        for c in candidates:
            # try V2 metadata first
            qn = c.metadata.get('qualified_name') or c.metadata.get('name', '')
            summary = c.metadata.get('summary', '')
            sig = c.metadata.get('signature', '')

            if summary:
                doc = f"{qn}: {summary}"
            elif sig:
                doc = f"{qn}: {sig}"
            else:
                # fallback for V1 indexed data: use name + code snippet
                code = c.metadata.get('code', '')[:200]
                doc = f"{qn}: {code}" if code else qn

            # ensure non-empty doc
            if not doc.strip() or doc.strip() == ':':
                doc = c.metadata.get('name', 'unknown')

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
            qualified_name=m.get("qualified_name") or m.get("name", ""),
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
