"""
Embedding Provider - Abstraction layer for embedding models
Supports Voyage AI (code-optimized) and OpenAI (fallback)
"""
import os
from abc import ABC, abstractmethod
from typing import List, Optional
import asyncio

from services.observability import logger, capture_exception, track_time


class EmbeddingProvider(ABC):
    """Abstract base class for embedding providers"""
    
    @abstractmethod
    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of documents (code chunks)"""
    
    @abstractmethod
    async def embed_query(self, query: str) -> List[float]:
        """Embed a search query"""
    
    @property
    @abstractmethod
    def dimension(self) -> int:
        """Return embedding dimension"""
    
    @property
    @abstractmethod
    def model_name(self) -> str:
        """Return model name for logging"""


class VoyageCodeEmbedding(EmbeddingProvider):
    """
    Voyage AI voyage-code-3 embedding provider
    Optimized for code retrieval - 13.8% better than OpenAI on code tasks
    """
    
    BATCH_SIZE = 128  # voyage supports up to 128 texts per batch
    
    def __init__(self, api_key: Optional[str] = None, output_dimension: int = 1024):
        self.api_key = api_key or os.getenv("VOYAGE_API_KEY")
        if not self.api_key:
            raise ValueError("VOYAGE_API_KEY not set")
        
        self._dimension = output_dimension
        self._model = "voyage-code-3"
        
        # import here to avoid issues if not installed
        try:
            import voyageai
            self.client = voyageai.Client(api_key=self.api_key)
            logger.info("VoyageCodeEmbedding initialized", model=self._model, dimension=self._dimension)
        except ImportError:
            raise ImportError("voyageai package not installed. Run: pip install voyageai")
    
    @property
    def dimension(self) -> int:
        return self._dimension
    
    @property
    def model_name(self) -> str:
        return self._model
    
    @track_time("voyage_embed_documents")
    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed documents with input_type='document' for better retrieval"""
        if not texts:
            return []
        
        all_embeddings = []
        
        # batch processing
        for i in range(0, len(texts), self.BATCH_SIZE):
            batch = texts[i:i + self.BATCH_SIZE]
            
            try:
                # run in executor since voyageai is sync
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(
                    None,
                    lambda: self.client.embed(
                        batch,
                        model=self._model,
                        input_type="document",
                        output_dimension=self._dimension
                    )
                )
                all_embeddings.extend(result.embeddings)
                
            except Exception as e:
                logger.error("Voyage embed_documents failed", error=str(e), batch_size=len(batch))
                capture_exception(e, operation="voyage_embed_documents")
                raise
        
        logger.debug("Voyage embed_documents complete", count=len(texts), batches=(len(texts) // self.BATCH_SIZE) + 1)
        return all_embeddings
    
    @track_time("voyage_embed_query")
    async def embed_query(self, query: str) -> List[float]:
        """Embed query with input_type='query' for better retrieval"""
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self.client.embed(
                    [query],
                    model=self._model,
                    input_type="query",
                    output_dimension=self._dimension
                )
            )
            return result.embeddings[0]
            
        except Exception as e:
            logger.error("Voyage embed_query failed", error=str(e), query=query[:100])
            capture_exception(e, operation="voyage_embed_query")
            raise


class OpenAIEmbedding(EmbeddingProvider):
    """
    OpenAI embedding provider (fallback)
    Uses text-embedding-3-small by default
    """
    
    BATCH_SIZE = 100
    
    def __init__(self, api_key: Optional[str] = None, model: str = "text-embedding-3-small"):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY not set")
        
        self._model = model
        # dimension depends on model
        self._dimension = 1536 if "small" in model else 3072
        
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(api_key=self.api_key)
        logger.info("OpenAIEmbedding initialized", model=self._model, dimension=self._dimension)
    
    @property
    def dimension(self) -> int:
        return self._dimension
    
    @property
    def model_name(self) -> str:
        return self._model
    
    @track_time("openai_embed_documents")
    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed documents using OpenAI"""
        if not texts:
            return []
        
        all_embeddings = []
        
        for i in range(0, len(texts), self.BATCH_SIZE):
            batch = texts[i:i + self.BATCH_SIZE]
            
            try:
                response = await self.client.embeddings.create(
                    model=self._model,
                    input=batch
                )
                batch_embeddings = [item.embedding for item in response.data]
                all_embeddings.extend(batch_embeddings)
                
            except Exception as e:
                logger.error("OpenAI embed_documents failed", error=str(e))
                capture_exception(e, operation="openai_embed_documents")
                raise
        
        return all_embeddings
    
    @track_time("openai_embed_query")
    async def embed_query(self, query: str) -> List[float]:
        """Embed query using OpenAI"""
        try:
            response = await self.client.embeddings.create(
                model=self._model,
                input=[query]
            )
            return response.data[0].embedding
            
        except Exception as e:
            logger.error("OpenAI embed_query failed", error=str(e))
            capture_exception(e, operation="openai_embed_query")
            raise


def get_embedding_provider(provider: str = "auto") -> EmbeddingProvider:
    """
    Factory function to get embedding provider
    
    Args:
        provider: "voyage", "openai", or "auto" (tries voyage first)
    """
    if provider == "voyage":
        return VoyageCodeEmbedding()
    elif provider == "openai":
        return OpenAIEmbedding()
    elif provider == "auto":
        # try voyage first (better for code), fall back to openai
        if os.getenv("VOYAGE_API_KEY"):
            try:
                return VoyageCodeEmbedding()
            except Exception as e:
                logger.warning("Voyage unavailable, falling back to OpenAI", error=str(e))
        return OpenAIEmbedding()
    else:
        raise ValueError(f"Unknown embedding provider: {provider}")
