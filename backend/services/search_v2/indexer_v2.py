"""
Indexer V2 - Semantic Search with Natural Language Descriptions

Key differences from V1:
- Generates NL descriptions for each function
- Embeds DESCRIPTIONS (not raw code)  
- Stores both code (for display) and description (for search)
- ~15-20% better search accuracy based on Greptile research

Architecture:
1. Parse code → Extract functions (same as v1)
2. Generate NL descriptions for each function (NEW)
3. Embed descriptions using text-embedding-3-small
4. Store in Pinecone with code + description metadata
"""
import os
import asyncio
import hashlib
import time
from pathlib import Path
from typing import List, Dict, Optional
from dataclasses import dataclass

# Tree-sitter for parsing
import tree_sitter_python as tspython
import tree_sitter_javascript as tsjavascript
from tree_sitter import Language, Parser

# AI/ML
from openai import AsyncOpenAI
from pinecone import Pinecone, ServerlessSpec

from dotenv import load_dotenv

# V2 components
from .description_generator import DescriptionGenerator, FunctionDescription

load_dotenv()

# Configuration
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
EMBEDDING_DIMENSIONS = 3072 if "large" in EMBEDDING_MODEL else 1536
PINECONE_INDEX_V2 = os.getenv("PINECONE_INDEX_V2", "codeintel-v2")


@dataclass
class IndexingStats:
    """Statistics from indexing operation"""
    files_processed: int
    functions_extracted: int
    descriptions_generated: int
    vectors_stored: int
    time_seconds: float
    tokens_used: int
    estimated_cost: float


class IndexerV2:
    """
    V2 Indexer with Natural Language Descriptions
    
    Improvements over V1:
    - NL descriptions for better semantic matching
    - Richer metadata for search context
    - Optimized batch processing
    """
    
    # Batch sizes
    EMBEDDING_BATCH_SIZE = 100
    FILE_BATCH_SIZE = 10
    PINECONE_UPSERT_BATCH = 100
    
    def __init__(self, use_separate_index: bool = True):
        """
        Initialize IndexerV2.
        
        Args:
            use_separate_index: If True, use separate Pinecone index for v2.
                              If False, reuse v1 index (not recommended).
        """
        # OpenAI client
        self.openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Description generator
        self.description_generator = DescriptionGenerator(self.openai_client)
        
        # Pinecone setup
        pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        
        # Use v2 index or v1 index
        index_name = PINECONE_INDEX_V2 if use_separate_index else os.getenv("PINECONE_INDEX_NAME", "codeintel")
        
        # Check/create index
        existing_indexes = pc.list_indexes().names()
        if index_name not in existing_indexes:
            print(f"📊 Creating Pinecone v2 index: {index_name}")
            pc.create_index(
                name=index_name,
                dimension=EMBEDDING_DIMENSIONS,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1")
            )
        else:
            print(f"📊 Using existing Pinecone index: {index_name}")
        
        self.index = pc.Index(index_name)
        self.index_name = index_name
        
        # Tree-sitter parsers
        self.parsers = {
            'python': self._create_parser(Language(tspython.language())),
            'javascript': self._create_parser(Language(tsjavascript.language())),
            'typescript': self._create_parser(Language(tsjavascript.language())),
        }
        
        print(f"✅ IndexerV2 initialized!")
        print(f"   Embedding model: {EMBEDDING_MODEL}")
        print(f"   Pinecone index: {index_name}")
    
    def _create_parser(self, language) -> Parser:
        """Create tree-sitter parser"""
        parser = Parser(language)
        return parser
    
    def _detect_language(self, file_path: str) -> Optional[str]:
        """Detect language from file extension"""
        ext = Path(file_path).suffix.lower()
        return {
            '.py': 'python',
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
        }.get(ext)
    
    def _discover_code_files(self, repo_path: str) -> List[Path]:
        """Find all indexable code files"""
        repo_path = Path(repo_path)
        code_files = []
        
        extensions = {'.py', '.js', '.jsx', '.ts', '.tsx'}
        skip_dirs = {'node_modules', '.git', '__pycache__', 'venv', 'env', 
                    'dist', 'build', '.next', '.vscode', 'coverage'}
        
        for file_path in repo_path.rglob('*'):
            if file_path.is_dir():
                continue
            if any(skip in file_path.parts for skip in skip_dirs):
                continue
            if file_path.suffix in extensions:
                code_files.append(file_path)
        
        return code_files
    
    def _extract_functions(self, tree_node, source_code: bytes) -> List[Dict]:
        """Extract functions/classes from AST"""
        functions = []
        
        target_types = {
            'function_definition',
            'class_definition', 
            'function_declaration',
            'method_definition',
            'arrow_function',
        }
        
        if tree_node.type in target_types:
            # Get function name
            name_node = None
            for child in tree_node.children:
                if child.type == 'identifier':
                    name_node = child
                    break
            
            name = source_code[name_node.start_byte:name_node.end_byte].decode('utf-8') if name_node else 'anonymous'
            code = source_code[tree_node.start_byte:tree_node.end_byte].decode('utf-8')
            
            functions.append({
                'name': name,
                'type': tree_node.type,
                'code': code,
                'start_line': tree_node.start_point[0],
                'end_line': tree_node.end_point[0],
            })
        
        # Recursively process children
        for child in tree_node.children:
            functions.extend(self._extract_functions(child, source_code))
        
        return functions
    
    async def _extract_functions_from_file(self, repo_id: str, file_path: str) -> List[Dict]:
        """Extract all functions from a single file"""
        try:
            language = self._detect_language(file_path)
            if not language or language not in self.parsers:
                return []
            
            with open(file_path, 'rb') as f:
                source_code = f.read()
            
            tree = self.parsers[language].parse(source_code)
            functions = self._extract_functions(tree.root_node, source_code)
            
            # Add metadata
            for func in functions:
                func['file_path'] = file_path
                func['language'] = language
                func['repo_id'] = repo_id
            
            return functions
            
        except Exception as e:
            print(f"❌ Error processing {file_path}: {e}")
            return []
    
    async def _create_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for batch of texts"""
        if not texts:
            return []
        
        try:
            # Truncate long texts
            truncated = [text[:8000] for text in texts]
            
            response = await self.openai_client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=truncated
            )
            
            return [item.embedding for item in response.data]
            
        except Exception as e:
            print(f"❌ Embedding error: {e}")
            return [[0.0] * EMBEDDING_DIMENSIONS for _ in texts]
    
    async def index_repository(
        self, 
        repo_id: str, 
        repo_path: str,
        progress_callback=None
    ) -> IndexingStats:
        """
        Index repository with V2 (NL descriptions).
        
        This is the main entry point for V2 indexing.
        """
        start_time = time.time()
        
        print(f"\n{'='*60}")
        print(f"🚀 INDEXER V2 - Starting indexing")
        print(f"{'='*60}")
        print(f"📂 Repo ID: {repo_id}")
        print(f"📂 Path: {repo_path}")
        
        # Step 1: Discover files
        code_files = self._discover_code_files(repo_path)
        total_files = len(code_files)
        print(f"\n📄 Found {total_files} code files")
        
        if not code_files:
            return IndexingStats(0, 0, 0, 0, 0, 0, 0)
        
        # Step 2: Extract functions from all files
        print(f"\n🔍 Step 1/4: Extracting functions...")
        all_functions = []
        
        for i in range(0, total_files, self.FILE_BATCH_SIZE):
            batch = code_files[i:i + self.FILE_BATCH_SIZE]
            
            batch_results = await asyncio.gather(
                *[self._extract_functions_from_file(repo_id, str(f)) for f in batch],
                return_exceptions=True
            )
            
            for result in batch_results:
                if isinstance(result, list):
                    all_functions.extend(result)
            
            processed = min(i + self.FILE_BATCH_SIZE, total_files)
            print(f"   Processed {processed}/{total_files} files")
        
        total_functions = len(all_functions)
        print(f"   ✅ Extracted {total_functions} functions")
        
        if not all_functions:
            return IndexingStats(total_files, 0, 0, 0, time.time() - start_time, 0, 0)
        
        # Step 3: Generate NL descriptions (THE KEY V2 FEATURE)
        print(f"\n🧠 Step 2/4: Generating NL descriptions...")
        descriptions = await self.description_generator.generate_descriptions_batch(
            all_functions,
            progress_callback=progress_callback
        )
        
        # Map descriptions to functions
        desc_map = {
            f"{d.file_path}:{d.function_name}": d 
            for d in descriptions
        }
        
        # Step 4: Create embeddings for DESCRIPTIONS (not code!)
        print(f"\n🔢 Step 3/4: Generating embeddings for descriptions...")
        
        # Build embedding texts from descriptions
        embedding_texts = []
        for func in all_functions:
            key = f"{func['file_path']}:{func['name']}"
            desc = desc_map.get(key)
            
            if desc:
                # Embed: description + keywords + function name
                embed_text = f"{desc.description}\n\nKeywords: {', '.join(desc.keywords)}\nFunction: {func['name']}"
            else:
                # Fallback to function name
                embed_text = f"Function: {func['name']}"
            
            embedding_texts.append(embed_text)
        
        # Generate embeddings in batches
        all_embeddings = []
        for i in range(0, len(embedding_texts), self.EMBEDDING_BATCH_SIZE):
            batch = embedding_texts[i:i + self.EMBEDDING_BATCH_SIZE]
            batch_embeddings = await self._create_embeddings_batch(batch)
            all_embeddings.extend(batch_embeddings)
            
            processed = min(i + self.EMBEDDING_BATCH_SIZE, len(embedding_texts))
            print(f"   Generated {processed}/{len(embedding_texts)} embeddings")
        
        # Step 5: Store in Pinecone
        print(f"\n☁️  Step 4/4: Storing in Pinecone...")
        vectors = []
        
        for func, embedding in zip(all_functions, all_embeddings):
            key = f"{func['file_path']}:{func['name']}"
            desc = desc_map.get(key)
            
            vector_id = hashlib.md5(
                f"{repo_id}:{func['file_path']}:{func['start_line']}:v2".encode()
            ).hexdigest()
            
            vectors.append({
                "id": vector_id,
                "values": embedding,
                "metadata": {
                    "repo_id": repo_id,
                    "file_path": func['file_path'],
                    "name": func['name'],
                    "type": func['type'],
                    "code": func['code'][:1500],  # Store code for display
                    "description": desc.description if desc else "",  # NL description
                    "keywords": desc.keywords if desc else [],
                    "start_line": func['start_line'],
                    "end_line": func['end_line'],
                    "language": func['language'],
                    "version": "v2"  # Mark as v2 indexed
                }
            })
        
        # Upsert to Pinecone
        for i in range(0, len(vectors), self.PINECONE_UPSERT_BATCH):
            batch = vectors[i:i + self.PINECONE_UPSERT_BATCH]
            self.index.upsert(vectors=batch)
            
            processed = min(i + self.PINECONE_UPSERT_BATCH, len(vectors))
            print(f"   Uploaded {processed}/{len(vectors)} vectors")
        
        # Stats
        elapsed = time.time() - start_time
        gen_stats = self.description_generator.get_stats()
        
        print(f"\n{'='*60}")
        print(f"✅ V2 INDEXING COMPLETE!")
        print(f"{'='*60}")
        print(f"   Files processed: {total_files}")
        print(f"   Functions extracted: {total_functions}")
        print(f"   Descriptions generated: {len(descriptions)}")
        print(f"   Vectors stored: {len(vectors)}")
        print(f"   Time: {elapsed:.2f}s")
        print(f"   Speed: {total_functions/elapsed:.1f} functions/sec")
        print(f"   LLM tokens used: {gen_stats['total_tokens_used']:,}")
        print(f"   Estimated cost: ${gen_stats['estimated_cost_usd']:.4f}")
        
        return IndexingStats(
            files_processed=total_files,
            functions_extracted=total_functions,
            descriptions_generated=len(descriptions),
            vectors_stored=len(vectors),
            time_seconds=elapsed,
            tokens_used=gen_stats['total_tokens_used'],
            estimated_cost=gen_stats['estimated_cost_usd']
        )
    
    async def semantic_search(
        self,
        query: str,
        repo_id: str,
        max_results: int = 10
    ) -> List[Dict]:
        """
        V2 Semantic Search - searches against NL descriptions.
        
        Since both query and stored descriptions are natural language,
        semantic similarity works much better.
        """
        try:
            # Generate query embedding (query is already NL, no transformation needed)
            query_embeddings = await self._create_embeddings_batch([query])
            query_embedding = query_embeddings[0]
            
            # Search Pinecone
            results = self.index.query(
                vector=query_embedding,
                filter={
                    "repo_id": {"$eq": repo_id},
                    "version": {"$eq": "v2"}  # Only search v2 indexed content
                },
                top_k=max_results,
                include_metadata=True
            )
            
            # Format results
            formatted = []
            for match in results.matches:
                meta = match.metadata
                formatted.append({
                    "code": meta.get("code", ""),
                    "file_path": meta.get("file_path", ""),
                    "name": meta.get("name", ""),
                    "type": meta.get("type", ""),
                    "language": meta.get("language", ""),
                    "description": meta.get("description", ""),  # Include NL description
                    "keywords": meta.get("keywords", []),
                    "score": float(match.score),
                    "line_start": meta.get("start_line", 0),
                    "line_end": meta.get("end_line", 0),
                })
            
            return formatted
            
        except Exception as e:
            print(f"❌ Search error: {e}")
            return []
    
    def get_index_stats(self, repo_id: str) -> Dict:
        """Get indexing stats for a repository"""
        try:
            stats = self.index.describe_index_stats()
            return {
                "total_vectors": stats.total_vector_count,
                "index_name": self.index_name,
                "dimension": EMBEDDING_DIMENSIONS
            }
        except Exception as e:
            return {"error": str(e)}
