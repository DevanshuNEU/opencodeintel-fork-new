"""Health check endpoint."""
from fastapi import APIRouter
from dependencies import metrics

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    """Health check endpoint with metrics."""
    perf_metrics = metrics.get_metrics()
    
    return {
        "status": "healthy",
        "service": "codeintel-api",
        "performance": perf_metrics["summary"]
    }
