"""
CodeIntel Backend API
FastAPI backend for codebase intelligence
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import os

# Import routers
from routes.auth import router as auth_router
from routes.health import router as health_router
from routes.playground import router as playground_router, load_demo_repos
from routes.repos import router as repos_router, websocket_index
from routes.search import router as search_router
from routes.analysis import router as analysis_router
from routes.api_keys import router as api_keys_router


# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await load_demo_repos()
    yield
    # Shutdown (cleanup if needed)


app = FastAPI(
    title="CodeIntel API",
    description="Codebase Intelligence API for MCP",
    version="0.2.0",
    lifespan=lifespan
)


# ===== MIDDLEWARE =====

class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """Limit request body size to prevent abuse."""
    MAX_REQUEST_SIZE = 10 * 1024 * 1024  # 10MB
    
    async def dispatch(self, request: Request, call_next):
        if request.method in ["POST", "PUT", "PATCH"]:
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > self.MAX_REQUEST_SIZE:
                return JSONResponse(
                    status_code=413,
                    content={"detail": f"Request too large (max {self.MAX_REQUEST_SIZE / 1024 / 1024}MB)"}
                )
        return await call_next(request)


# Add middleware
app.add_middleware(RequestSizeLimitMiddleware)

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# ===== ROUTERS =====

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(playground_router)
app.include_router(repos_router)
app.include_router(search_router)
app.include_router(analysis_router)
app.include_router(api_keys_router)

# WebSocket endpoint (can't be in router easily)
app.add_api_websocket_route("/ws/index/{repo_id}", websocket_index)


# ===== ERROR HANDLERS =====

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with clear messages."""
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation error",
            "errors": exc.errors()
        }
    )


@app.exception_handler(429)
async def rate_limit_handler(request: Request, exc):
    """Handle rate limit errors."""
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Please try again later."}
    )
