"""
Playground routes package.

Split from a 1306-line monolith into focused modules:
  search.py     -- search endpoint, repo resolution
  session.py    -- session info, rate limits
  validation.py -- GitHub URL validation, metadata
  indexing.py   -- anonymous indexing start + status
  helpers.py    -- shared constants and utilities
"""
from fastapi import APIRouter

from routes.playground.helpers import load_demo_repos
from routes.playground.search import router as search_router
from routes.playground.session import router as session_router
from routes.playground.validation import router as validation_router
from routes.playground.indexing import router as indexing_router

# Re-export for main.py: from routes.playground import router, load_demo_repos
router = APIRouter(prefix="/playground", tags=["Playground"])
router.include_router(session_router)
router.include_router(search_router)
router.include_router(validation_router)
router.include_router(indexing_router)

# Re-export DEMO_REPO_IDS for tests that reference it
from routes.playground.helpers import DEMO_REPO_IDS

__all__ = ["router", "load_demo_repos", "DEMO_REPO_IDS"]
