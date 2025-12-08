"""
Semantic Search v2 - Function-Level Intelligence

This module implements the improved semantic search with:
- Natural language descriptions for code (not raw code embeddings)
- Better accuracy through NL-to-NL similarity matching
- Based on Greptile research showing 85%+ accuracy with this approach
"""

from .description_generator import DescriptionGenerator
from .indexer_v2 import IndexerV2

__all__ = ["DescriptionGenerator", "IndexerV2"]
