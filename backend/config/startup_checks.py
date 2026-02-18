"""
Startup environment validation.
Fails fast with clear error messages if required config is missing.
"""
import os
import sys
from typing import List, Tuple

from services.observability import logger


# (env_var_name, description, required)
REQUIRED_VARS: List[Tuple[str, str]] = [
    ("SUPABASE_URL", "Supabase project URL"),
    ("SUPABASE_ANON_KEY", "Supabase anon/public key"),
    ("SUPABASE_JWT_SECRET", "Supabase JWT secret for token verification"),
    ("OPENAI_API_KEY", "OpenAI API key for embeddings"),
    ("PINECONE_API_KEY", "Pinecone API key for vector storage"),
]

OPTIONAL_VARS: List[Tuple[str, str, str]] = [
    ("SUPABASE_SERVICE_ROLE_KEY", "Supabase service role key", "Using anon key as fallback"),
    ("COHERE_API_KEY", "Cohere API key for reranking", "Search reranking disabled"),
    ("VOYAGE_API_KEY", "Voyage AI key for code embeddings", "Using OpenAI embeddings"),
    ("SENTRY_DSN", "Sentry DSN for error tracking", "Error tracking disabled"),
    ("REDIS_HOST", "Redis host for caching", "Using default localhost"),
]


def validate_environment() -> None:
    """Check required env vars exist. Log warnings for optional ones."""
    missing: List[str] = []

    for var_name, description in REQUIRED_VARS:
        value = os.getenv(var_name)
        if not value:
            missing.append(f"  {var_name} -- {description}")

    if missing:
        msg = "Missing required environment variables:\n" + "\n".join(missing)
        msg += "\n\nSee .env.example for configuration reference."
        logger.error(msg)
        print(f"\n[FATAL] {msg}\n", file=sys.stderr)
        sys.exit(1)

    # warn about optional vars
    for var_name, description, fallback_msg in OPTIONAL_VARS:
        if not os.getenv(var_name):
            logger.warning(f"{var_name} not set ({description}). {fallback_msg}")

    logger.info("Environment validation passed")
