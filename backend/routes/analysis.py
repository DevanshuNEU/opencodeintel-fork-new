"""Analysis routes - dependencies, impact, insights, style."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from dependencies import (
    dependency_analyzer, style_analyzer, dna_extractor,
    get_repo_or_404
)
from services.input_validator import InputValidator
from middleware.auth import require_auth, AuthContext
from services.observability import logger, metrics, capture_exception

router = APIRouter(prefix="/repos", tags=["Analysis"])


class ImpactRequest(BaseModel):
    repo_id: str
    file_path: str


@router.get("/{repo_id}/dependencies")
async def get_dependency_graph(
    repo_id: str,
    auth: AuthContext = Depends(require_auth)
):
    """Get dependency graph for repository."""
    try:
        repo = get_repo_or_404(repo_id, auth.user_id)

        cached_graph = dependency_analyzer.load_from_cache(repo_id)
        if cached_graph:
            logger.debug("Using cached dependency graph", repo_id=repo_id)
            return {**cached_graph, "cached": True}

        logger.info("Building fresh dependency graph", repo_id=repo_id)
        graph_data = dependency_analyzer.build_dependency_graph(repo["local_path"])
        dependency_analyzer.save_to_cache(repo_id, graph_data)

        return {**graph_data, "cached": False}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Dependency graph failed", repo_id=repo_id, error=str(e))
        capture_exception(e, operation="dependency_graph", repo_id=repo_id)
        raise HTTPException(status_code=500, detail="Failed to build dependency graph")


@router.post("/{repo_id}/impact")
async def analyze_impact(
    repo_id: str,
    request: ImpactRequest,
    auth: AuthContext = Depends(require_auth)
):
    """Analyze impact of changing a file."""
    try:
        repo = get_repo_or_404(repo_id, auth.user_id)

        valid_path, path_error = InputValidator.validate_file_path(
            request.file_path, repo["local_path"]
        )
        if not valid_path:
            raise HTTPException(status_code=400, detail=f"Invalid file path: {path_error}")

        graph_data = dependency_analyzer.load_from_cache(repo_id)
        if not graph_data:
            logger.info("Building dependency graph for impact analysis", repo_id=repo_id)
            graph_data = dependency_analyzer.build_dependency_graph(repo["local_path"])
            dependency_analyzer.save_to_cache(repo_id, graph_data)

        impact = dependency_analyzer.get_file_impact(
            repo["local_path"],
            request.file_path,
            graph_data
        )

        return impact
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Impact analysis failed", repo_id=repo_id, file_path=request.file_path, error=str(e))
        capture_exception(e, operation="impact_analysis", repo_id=repo_id)
        raise HTTPException(status_code=500, detail="Failed to analyze impact")


@router.get("/{repo_id}/insights")
async def get_repository_insights(
    repo_id: str,
    auth: AuthContext = Depends(require_auth)
):
    """Get comprehensive insights about repository."""
    try:
        repo = get_repo_or_404(repo_id, auth.user_id)

        graph_data = dependency_analyzer.load_from_cache(repo_id)
        if not graph_data:
            logger.info("Building dependency graph for insights", repo_id=repo_id)
            graph_data = dependency_analyzer.build_dependency_graph(repo["local_path"])
            dependency_analyzer.save_to_cache(repo_id, graph_data)

        return {
            "repo_id": repo_id,
            "name": repo["name"],
            "graph_metrics": graph_data.get("metrics", {}),
            "total_files": len(graph_data.get("dependencies", {})),
            "total_dependencies": sum(
                len(deps) for deps in graph_data.get("dependencies", {}).values()
            ),
            "status": repo["status"],
            "functions_indexed": repo["file_count"],
            "cached": bool(graph_data)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Repository insights failed", repo_id=repo_id, error=str(e))
        capture_exception(e, operation="insights", repo_id=repo_id)
        raise HTTPException(status_code=500, detail="Failed to get repository insights")


@router.get("/{repo_id}/style-analysis")
async def get_style_analysis(
    repo_id: str,
    auth: AuthContext = Depends(require_auth)
):
    """Analyze code style and team patterns."""
    try:
        repo = get_repo_or_404(repo_id, auth.user_id)

        cached_style = style_analyzer.load_from_cache(repo_id)
        if cached_style:
            logger.debug("Using cached code style", repo_id=repo_id)
            return {**cached_style, "cached": True}

        logger.info("Analyzing code style", repo_id=repo_id)
        style_data = style_analyzer.analyze_repository_style(repo["local_path"])
        style_analyzer.save_to_cache(repo_id, style_data)

        return {**style_data, "cached": False}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Style analysis failed", repo_id=repo_id, error=str(e))
        capture_exception(e, operation="style_analysis", repo_id=repo_id)
        raise HTTPException(status_code=500, detail="Failed to analyze code style")


@router.get("/{repo_id}/dna")
async def get_codebase_dna(
    repo_id: str,
    format: str = "json",
    auth: AuthContext = Depends(require_auth)
):
    """
    Extract codebase DNA - architectural patterns, conventions, and constraints.

    This endpoint analyzes your codebase and returns a DNA profile that helps
    AI assistants understand how to write code consistent with your patterns.

    Args:
        repo_id: Repository identifier
        format: Output format - 'json' or 'markdown' (default: json)

    Returns:
        DNA profile with auth patterns, service patterns, database patterns, etc.
    """
    try:
        repo = get_repo_or_404(repo_id, auth.user_id)

        cached_dna = dna_extractor.load_from_cache(repo_id)
        if cached_dna:
            logger.debug("Using cached DNA", repo_id=repo_id)
            if format == "markdown":
                return {"dna": cached_dna.to_markdown(), "cached": True}
            return {**cached_dna.to_dict(), "cached": True}

        logger.info("Extracting codebase DNA", repo_id=repo_id)
        metrics.increment("dna_extractions")

        dna = dna_extractor.extract_dna(repo["local_path"], repo_id)
        dna_extractor.save_to_cache(repo_id, dna)

        if format == "markdown":
            return {"dna": dna.to_markdown(), "cached": False}
        return {**dna.to_dict(), "cached": False}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("DNA extraction failed", repo_id=repo_id, error=str(e))
        capture_exception(e, operation="dna_extraction", repo_id=repo_id)
        raise HTTPException(status_code=500, detail="Failed to extract codebase DNA")
