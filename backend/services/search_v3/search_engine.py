"""
Search Engine V3 - "Project Brain" 
Full semantic code search with:
- Voyage AI code-optimized embeddings
- Query understanding & intent classification
- Code graph importance ranking
- Test file filtering
- BM25 + Vector hybrid search
- Cohere reranking
"""
import os
import asyncio
from typing import List, Dict, Optional, Any
from dataclasses import dataclass

from services.observability import logger, capture_exception, track_time, metrics
from services.search_v3.embedding_provider import EmbeddingProvider, get_embedding_provider
from services.search_v3.query_understanding import QueryUnderstanding, QueryAnalysis, QueryIntent
from services.search_v3.code_graph_ranker import CodeGraphRanker


@dataclass
class SearchConfig:
    """Configuration for search behavior"""
    include_tests: bool = False
    use_code_graph: bool = True
    use_reranking: bool = True
    use_query_expansion: bool = True
    top_k: int = 10
    rerank_top_n: int = 50


@dataclass 
class SearchResult:
    """A single search result"""
    name: str
    qualified_name: str
    file_path: str
    code: str
    score: float
    line_start: int
    line_end: int
    type: str
    language: str
    signature: Optional[str] = None
    summary: Optional[str] = None
    is_test_file: bool = False
    importance_score: float = 0.5


class SearchEngineV3:
    """
    The "Project Brain" search engine
    
    Pipeline:
    1. Query Understanding -> Extract intent, expand query
    2. Hybrid Retrieval -> BM25 + Voyage embeddings
    3. Code Graph Boosting -> Boost by importance, filter tests
    4. Cohere Reranking -> Final semantic pass
    """
    
    def __init__(
        self,
        embedding_provider: Optional[EmbeddingProvider] = None,
        cohere_api_key: Optional[str] = None
    ):
        # embedding provider (Voyage or OpenAI)
        self.embedding_provider = embedding_provider or get_embedding_provider("auto")
        
        # query understanding
        self.query_understanding = QueryUnderstanding()
        
        # code graph ranker
        self.code_graph_ranker = CodeGraphRanker()
        
        # cohere for reranking
        self.cohere_api_key = cohere_api_key or os.getenv("COHERE_API_KEY")
        self.cohere_client = None
        if self.cohere_api_key:
            try:
                import cohere
                self.cohere_client = cohere.Client(self.cohere_api_key)
                logger.info("Cohere reranking enabled")
            except ImportError:
                logger.warning("Cohere package not installed, reranking disabled")
        
        logger.info("SearchEngineV3 initialized",
                   embedding_model=self.embedding_provider.model_name,
                   reranking_enabled=bool(self.cohere_client))
    
    @track_time("search_v3")
    async def search(
        self,
        query: str,
        repo_id: str,
        pinecone_index: Any,
        file_dependencies: Optional[Dict[str, List[str]]] = None,
        config: Optional[SearchConfig] = None,
        pro_user: bool = False
    ) -> List[Dict]:
        """
        Execute full search pipeline
        
        Args:
            query: User's search query
            repo_id: Repository ID in Pinecone
            pinecone_index: Pinecone index instance
            file_dependencies: Pre-loaded dependency graph (optional)
            config: Search configuration
        """
        config = config or SearchConfig()
        
        try:
            # step 1: query understanding
            analysis = self.query_understanding.analyze(query)
            
            # override test inclusion from query analysis
            include_tests = config.include_tests or analysis.should_include_tests
            
            # step 2: get search query (expanded or original)
            search_query = analysis.expanded_query if config.use_query_expansion else query
            
            # step 3: hybrid retrieval
            results = await self._hybrid_search(
                query=search_query,
                original_query=query,
                repo_id=repo_id,
                pinecone_index=pinecone_index,
                top_k=config.rerank_top_n if config.use_reranking else config.top_k
            )
            
            if not results:
                logger.info("No results found", query=query, repo_id=repo_id)
                return []
            
            # step 4: code graph boosting
            if config.use_code_graph and file_dependencies:
                importance_map = self.code_graph_ranker.calculate_importance(
                    repo_id, file_dependencies
                )
                results = self.code_graph_ranker.boost_results(
                    results, importance_map, include_tests
                )
            else:
                # at minimum, filter tests
                if not include_tests:
                    results = self.code_graph_ranker.filter_test_files(results, include_tests)
            
            # step 5: reranking (pro users only - Cohere costs money)
            reranking_used = False
            if config.use_reranking and self.cohere_client and pro_user and len(results) > 1:
                results = await self._rerank_results(query, results, config.top_k * 2)
                # re-apply test filtering after rerank (Cohere doesn't know our preference)
                if not include_tests:
                    results = [r for r in results if not self.code_graph_ranker._is_test_file(r.get('file_path', ''))]
                results = results[:config.top_k]
                reranking_used = True
            else:
                results = results[:config.top_k]
            
            # log search metrics
            metrics.increment("search_v3_queries")
            logger.info("Search V3 complete",
                       query=query[:50],
                       intent=analysis.intent.value,
                       result_count=len(results),
                       include_tests=include_tests,
                       pro_user=pro_user,
                       reranking_used=reranking_used)
            
            return results
            
        except Exception as e:
            logger.error("Search V3 failed", query=query, error=str(e))
            capture_exception(e, operation="search_v3", query=query)
            raise
    
    async def _hybrid_search(
        self,
        query: str,
        original_query: str,
        repo_id: str,
        pinecone_index: Any,
        top_k: int
    ) -> List[Dict]:
        """
        Hybrid search: BM25 + Vector similarity with RRF fusion
        """
        # get query embedding
        query_embedding = await self.embedding_provider.embed_query(query)
        
        # vector search in Pinecone
        try:
            vector_results = pinecone_index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
                filter={"repo_id": repo_id}
            )
        except Exception as e:
            logger.error("Pinecone query failed", error=str(e))
            raise
        
        if not vector_results.matches:
            return []
        
        # convert to standard format
        results = []
        for match in vector_results.matches:
            metadata = match.metadata or {}
            results.append({
                "name": metadata.get("name", "unknown"),
                "qualified_name": metadata.get("qualified_name", metadata.get("name", "")),
                "file_path": metadata.get("file_path", ""),
                "code": metadata.get("code", ""),
                "score": float(match.score),
                "line_start": metadata.get("line_start", 0),
                "line_end": metadata.get("line_end", 0),
                "type": metadata.get("type", "function"),
                "language": metadata.get("language", "python"),
                "signature": metadata.get("signature"),
                "summary": metadata.get("summary"),
            })
        
        # BM25 scoring (simplified - boost exact keyword matches)
        results = self._apply_bm25_boost(results, original_query)
        
        return results
    
    def _apply_bm25_boost(self, results: List[Dict], query: str) -> List[Dict]:
        """Apply BM25-style keyword boost to results"""
        query_terms = set(query.lower().split())
        
        for result in results:
            # check for keyword matches in name and code
            text = f"{result.get('name', '')} {result.get('qualified_name', '')} {result.get('summary', '')}".lower()
            
            # count matches
            matches = sum(1 for term in query_terms if term in text)
            
            # boost score based on matches
            if matches > 0:
                boost = 1 + (matches * 0.1)  # 10% boost per keyword match
                result['score'] = result['score'] * boost
        
        # re-sort
        results.sort(key=lambda x: x['score'], reverse=True)
        
        return results
    
    def _format_doc_as_yaml(self, result: Dict) -> str:
        """
        Format code result as YAML for optimal Cohere reranking.
        Cohere recommends YAML for structured/semi-structured data like code.
        """
        file_name = result.get('file_path', '').split('/')[-1] if result.get('file_path') else ''
        code_snippet = result.get('code', '')[:400].replace('\n', '\n  ')
        
        yaml_doc = f"""name: {result.get('name', 'unknown')}
type: {result.get('type', 'function')}
file: {file_name}
qualified_name: {result.get('qualified_name', '')}
signature: {result.get('signature', 'N/A')}
summary: {result.get('summary', 'N/A')}
code: |
  {code_snippet}"""
        return yaml_doc

    @track_time("cohere_rerank")
    async def _rerank_results(
        self,
        query: str,
        results: List[Dict],
        top_k: int
    ) -> List[Dict]:
        """
        Rerank results using Cohere rerank-v3.5
        
        Best practices applied:
        - YAML format for structured code data
        - Relevance threshold filtering (score >= 0.01)
        - Graceful fallback on errors
        """
        if not self.cohere_client:
            logger.debug("Cohere not configured, skipping rerank")
            return results[:top_k]
        
        if not results:
            return []
        
        # minimum relevance threshold (Cohere scores are 0-1)
        MIN_RELEVANCE = 0.01
        
        try:
            # format documents as YAML (Cohere best practice for code)
            documents = [self._format_doc_as_yaml(r) for r in results]
            
            # call Cohere rerank API
            loop = asyncio.get_event_loop()
            rerank_response = await loop.run_in_executor(
                None,
                lambda: self.cohere_client.rerank(
                    model="rerank-v3.5",
                    query=query,
                    documents=documents,
                    top_n=min(top_k * 2, len(documents))  # get extra for filtering
                )
            )
            
            # process reranked results
            reranked = []
            for item in rerank_response.results:
                # skip low-relevance results
                if item.relevance_score < MIN_RELEVANCE:
                    continue
                    
                idx = item.index
                if idx >= len(results):
                    continue
                    
                result = results[idx].copy()
                result['rerank_score'] = item.relevance_score
                result['original_score'] = results[idx].get('score', 0)
                # use rerank score as primary
                result['score'] = item.relevance_score
                reranked.append(result)
            
            # metrics for observability
            avg_score = sum(r['rerank_score'] for r in reranked) / len(reranked) if reranked else 0
            metrics.timing("search.rerank.avg_score", avg_score * 100)  # scale to percentage
            metrics.increment("search.rerank.success")
            
            logger.info("Cohere rerank complete",
                       query=query[:50],
                       input_count=len(results),
                       output_count=len(reranked),
                       avg_relevance=round(avg_score, 3))
            
            return reranked[:top_k]
            
        except Exception as e:
            logger.error("Cohere rerank failed, using original order", error=str(e))
            capture_exception(e, operation="cohere_rerank")
            metrics.increment("search.rerank.error")
            return results[:top_k]


# convenience function for direct use
async def search_v3(
    query: str,
    repo_id: str,
    pinecone_index: Any,
    file_dependencies: Optional[Dict[str, List[str]]] = None,
    include_tests: bool = False,
    top_k: int = 10,
    use_reranking: bool = True
) -> List[Dict]:
    """
    Convenience function for Search V3
    
    Example:
        results = await search_v3(
            query="authentication middleware",
            repo_id="abc-123",
            pinecone_index=index,
            include_tests=False
        )
    """
    engine = SearchEngineV3()
    config = SearchConfig(
        include_tests=include_tests,
        top_k=top_k,
        use_reranking=use_reranking
    )
    return await engine.search(
        query=query,
        repo_id=repo_id,
        pinecone_index=pinecone_index,
        file_dependencies=file_dependencies,
        config=config
    )
