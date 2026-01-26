"""
Search V3 Integration - Bridge between indexer and Search V3 components
Provides methods to use V3 search from existing indexer infrastructure
"""
import os
from typing import List, Dict, Optional, Any

from services.observability import logger, track_time
from services.search_v3.embedding_provider import get_embedding_provider, EmbeddingProvider
from services.search_v3.query_understanding import QueryUnderstanding
from services.search_v3.code_graph_ranker import CodeGraphRanker
from services.search_v3.search_engine import SearchEngineV3, SearchConfig


class SearchV3Integration:
    """
    Integration layer for Search V3
    Use this from the indexer to access V3 capabilities
    
    NOTE: For SEARCH queries, we use OpenAI embeddings to match the existing
    Pinecone index (1536 dim). V3 features like query understanding and 
    code graph ranking still work. For full Voyage benefits, repos need
    to be re-indexed with Voyage embeddings.
    """
    
    _instance = None
    
    @classmethod
    def get_instance(cls) -> 'SearchV3Integration':
        """Singleton instance"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        self._initialized = False
        self._index_embedding_provider = None
        self._voyage_embedding_provider = None
        self._search_engine = None
        self._query_understanding = None
        self._code_graph_ranker = None
    
    def _ensure_initialized(self):
        """Lazy initialization"""
        if not self._initialized:
            try:
                # for SEARCH: use OpenAI to match existing index (1536 dim)
                self._index_embedding_provider = get_embedding_provider("openai")
                
                # for NEW INDEXING: use Voyage if available
                try:
                    self._voyage_embedding_provider = get_embedding_provider("voyage")
                    logger.info("Voyage available for new indexing")
                except:
                    self._voyage_embedding_provider = self._index_embedding_provider
                
                self._query_understanding = QueryUnderstanding()
                self._code_graph_ranker = CodeGraphRanker()
                
                # search engine uses OpenAI for queries (matches index)
                # explicitly pass Cohere key for reranking
                self._search_engine = SearchEngineV3(
                    embedding_provider=self._index_embedding_provider,
                    cohere_api_key=os.getenv("COHERE_API_KEY")
                )
                self._initialized = True
                logger.info("SearchV3Integration initialized",
                           query_model=self._index_embedding_provider.model_name,
                           index_model=self._voyage_embedding_provider.model_name)
            except Exception as e:
                logger.error("Failed to initialize SearchV3Integration", error=str(e))
                raise
    
    @property
    def embedding_provider(self) -> EmbeddingProvider:
        """Get the embedding provider for queries (matches index)"""
        self._ensure_initialized()
        return self._index_embedding_provider
    
    @property
    def is_voyage_enabled(self) -> bool:
        """Check if Voyage AI is available for new indexing"""
        self._ensure_initialized()
        return "voyage" in self._voyage_embedding_provider.model_name.lower()
    
    @track_time("v3_embed_documents")
    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Embed documents using Voyage (if available) for NEW indexing.
        NOTE: This creates Voyage-dimension vectors. Repos indexed with this
        cannot be searched with OpenAI queries.
        """
        self._ensure_initialized()
        return await self._voyage_embedding_provider.embed_documents(texts)
    
    @track_time("v3_embed_query")
    async def embed_query(self, query: str) -> List[float]:
        """
        Embed a search query using OpenAI (matches existing index)
        """
        self._ensure_initialized()
        return await self._index_embedding_provider.embed_query(query)
    
    def analyze_query(self, query: str):
        """
        Analyze a query for intent and expansion
        Returns QueryAnalysis object
        """
        self._ensure_initialized()
        return self._query_understanding.analyze(query)
    
    def is_test_file(self, file_path: str) -> bool:
        """Check if a file path is a test file"""
        self._ensure_initialized()
        return self._code_graph_ranker._is_test_file(file_path)
    
    def calculate_importance(
        self, 
        repo_id: str, 
        file_dependencies: Dict[str, List[str]]
    ) -> Dict:
        """Calculate importance scores for files"""
        self._ensure_initialized()
        return self._code_graph_ranker.calculate_importance(repo_id, file_dependencies)
    
    def boost_and_filter_results(
        self,
        results: List[Dict],
        repo_id: str,
        file_dependencies: Dict[str, List[str]],
        include_tests: bool = False
    ) -> List[Dict]:
        """
        Apply code graph boosting and test filtering to results
        """
        self._ensure_initialized()
        
        importance_map = self._code_graph_ranker.calculate_importance(
            repo_id, file_dependencies
        )
        
        boosted = self._code_graph_ranker.boost_results(
            results, importance_map, include_tests
        )
        
        if not include_tests:
            boosted = self._code_graph_ranker.filter_test_files(boosted, include_tests)
        
        return boosted
    
    async def search(
        self,
        query: str,
        repo_id: str,
        pinecone_index: Any,
        file_dependencies: Optional[Dict[str, List[str]]] = None,
        include_tests: bool = False,
        top_k: int = 10,
        use_reranking: bool = True,
        pro_user: bool = False
    ) -> List[Dict]:
        """
        Full Search V3 pipeline
        
        Args:
            pro_user: Enable Cohere reranking (costs money, pro tier only)
        """
        self._ensure_initialized()
        
        config = SearchConfig(
            include_tests=include_tests,
            top_k=top_k,
            use_reranking=use_reranking,
            use_code_graph=file_dependencies is not None
        )
        
        return await self._search_engine.search(
            query=query,
            repo_id=repo_id,
            pinecone_index=pinecone_index,
            file_dependencies=file_dependencies,
            config=config,
            pro_user=pro_user
        )


# global singleton accessor
def get_search_v3() -> SearchV3Integration:
    """Get the Search V3 integration singleton"""
    return SearchV3Integration.get_instance()
