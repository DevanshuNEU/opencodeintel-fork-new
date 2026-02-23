"""
Observability Module
Centralized logging, tracing, metrics, and error tracking for CodeIntel

Single import for all observability needs:
    from services.observability import logger, metrics, capture_exception, track_time

    logger.info("Starting indexing", repo_id="abc", files=100)
    metrics.record_search(duration, cached=True)
    
    @trace_operation("indexing")
    async def index_repo(repo_id: str):
        ...
    
    with track_time("embedding_batch"):
        embeddings = await create_embeddings(texts)
"""
import os
import sys
import time
import logging
import json
from typing import Optional, Any, Dict
from functools import wraps
from contextlib import contextmanager
from datetime import datetime
from collections import deque

# Environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
IS_PRODUCTION = ENVIRONMENT == "production"
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO" if IS_PRODUCTION else "DEBUG")


# STRUCTURED LOGGER

class StructuredLogger:
    """
    Structured logger that outputs JSON in production, pretty logs in development.
    
    Usage:
        logger.info("User logged in", user_id="abc", ip="1.2.3.4")
        logger.error("Failed to index", repo_id="xyz", error=str(e))
    """
    
    def __init__(self, name: str = "codeintel"):
        self.name = name
        self.level = getattr(logging, LOG_LEVEL.upper(), logging.INFO)
        self._context: Dict[str, Any] = {}
    
    def _format_message(self, level: str, message: str, **kwargs) -> str:
        """Format log message based on environment"""
        data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": level,
            "service": self.name,
            "message": message,
            **self._context,
            **kwargs
        }
        
        if IS_PRODUCTION:
            # JSON for production (easy to parse in log aggregators)
            return json.dumps(data)
        else:
            # Pretty format for development
            extras = " | ".join(f"{k}={v}" for k, v in kwargs.items())
            ctx = " | ".join(f"{k}={v}" for k, v in self._context.items())
            parts = [f"[{level}] {message}"]
            if ctx:
                parts.append(f"[ctx: {ctx}]")
            if extras:
                parts.append(extras)
            return " ".join(parts)
    
    def _log(self, level: str, level_num: int, message: str, **kwargs):
        """Internal log method"""
        if level_num < self.level:
            return
        
        formatted = self._format_message(level, message, **kwargs)
        
        # Use stderr for errors, stdout for rest
        output = sys.stderr if level_num >= logging.ERROR else sys.stdout
        print(formatted, file=output)
    
    def set_context(self, **kwargs):
        """Set persistent context for all subsequent logs"""
        self._context.update(kwargs)
    
    def clear_context(self):
        """Clear all context"""
        self._context = {}
    
    def debug(self, message: str, **kwargs):
        self._log("DEBUG", logging.DEBUG, message, **kwargs)
    
    def info(self, message: str, **kwargs):
        self._log("INFO", logging.INFO, message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        self._log("WARNING", logging.WARNING, message, **kwargs)
    
    def error(self, message: str, **kwargs):
        self._log("ERROR", logging.ERROR, message, **kwargs)
    
    def critical(self, message: str, **kwargs):
        self._log("CRITICAL", logging.CRITICAL, message, **kwargs)


# Global logger instance
logger = StructuredLogger()


# SENTRY INTEGRATION HELPERS

def set_operation_context(operation: str, **kwargs):
    """
    Set Sentry context for current operation.
    
    Args:
        operation: Type of operation (indexing, search, analysis, etc.)
        **kwargs: Additional context (repo_id, user_id, etc.)
    """
    try:
        import sentry_sdk
        sentry_sdk.set_tag("operation", operation)
        for key, value in kwargs.items():
            sentry_sdk.set_tag(key, str(value))
        sentry_sdk.set_context("operation_details", {
            "type": operation,
            **kwargs
        })
    except ImportError:
        pass


def add_breadcrumb(message: str, category: str = "custom", level: str = "info", **data):
    """
    Add breadcrumb for Sentry error context.
    
    Breadcrumbs show the trail of events leading to an error.
    """
    try:
        import sentry_sdk
        sentry_sdk.add_breadcrumb(
            message=message,
            category=category,
            level=level,
            data=data
        )
    except ImportError:
        pass


def capture_exception(error: Exception, **context):
    """
    Capture exception to Sentry with additional context.
    
    Does NOT log to stdout -- callers are responsible for logging.
    This avoids double-logging when callers do logger.error() + capture_exception().
    """
    try:
        import sentry_sdk
        with sentry_sdk.push_scope() as scope:
            for key, value in context.items():
                scope.set_extra(key, value)
            sentry_sdk.capture_exception(error)
    except ImportError:
        # No Sentry -- log as fallback so errors aren't silently lost
        logger.error(f"Exception (no Sentry): {type(error).__name__}: {error}", **context)


def capture_message(message: str, level: str = "info", **context):
    """Capture a message (not exception) to Sentry"""
    try:
        import sentry_sdk
        with sentry_sdk.push_scope() as scope:
            for key, value in context.items():
                scope.set_extra(key, value)
            sentry_sdk.capture_message(message, level=level)
    except ImportError:
        pass


# PERFORMANCE TRACKING

@contextmanager
def track_time(operation: str, **tags):
    """
    Context manager to track operation duration.
    
    Usage:
        with track_time("embedding_batch", batch_size=100):
            embeddings = await create_embeddings(texts)
    
    Logs duration and creates Sentry span if available.
    """
    start = time.perf_counter()
    
    # Start Sentry span if available
    span = None
    try:
        import sentry_sdk
        span = sentry_sdk.start_span(op=operation, description=operation)
        for key, value in tags.items():
            span.set_tag(key, str(value))
    except ImportError:
        pass
    
    add_breadcrumb(f"Started: {operation}", category="performance", **tags)
    
    try:
        yield
    finally:
        duration = time.perf_counter() - start
        duration_ms = round(duration * 1000, 2)
        
        # Log completion
        logger.debug(f"{operation} completed", duration_ms=duration_ms, **tags)
        
        # Finish Sentry span
        if span:
            span.finish()
        
        add_breadcrumb(
            f"Completed: {operation}",
            category="performance",
            duration_ms=duration_ms,
            **tags
        )


def trace_operation(operation: str):
    """
    Decorator to trace an entire function/method.
    
    Usage:
        @trace_operation("index_repository")
        async def index_repository(repo_id: str):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Extract useful context from kwargs
            context = {k: v for k, v in kwargs.items() 
                      if k in ('repo_id', 'user_id', 'query', 'file_path')}
            
            set_operation_context(operation, **context)
            add_breadcrumb(f"Starting {operation}", category="function", **context)
            
            start = time.perf_counter()
            try:
                result = await func(*args, **kwargs)
                duration = time.perf_counter() - start
                logger.info(
                    f"{operation} completed successfully",
                    duration_s=round(duration, 2),
                    **context
                )
                return result
            except Exception as e:
                duration = time.perf_counter() - start
                capture_exception(e, operation=operation, duration_s=round(duration, 2), **context)
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            context = {k: v for k, v in kwargs.items() 
                      if k in ('repo_id', 'user_id', 'query', 'file_path')}
            
            set_operation_context(operation, **context)
            add_breadcrumb(f"Starting {operation}", category="function", **context)
            
            start = time.perf_counter()
            try:
                result = func(*args, **kwargs)
                duration = time.perf_counter() - start
                logger.info(
                    f"{operation} completed successfully",
                    duration_s=round(duration, 2),
                    **context
                )
                return result
            except Exception as e:
                duration = time.perf_counter() - start
                capture_exception(e, operation=operation, duration_s=round(duration, 2), **context)
                raise
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator


# METRICS (unified counters + performance tracking)

class Metrics:
    """
    Unified metrics: generic counters/timings/gauges plus
    domain-specific search and indexing performance tracking.
    
    Usage:
        metrics.increment("search_requests")
        metrics.timing("search_latency_ms", 150)
        metrics.record_search(duration, cached=True)
        metrics.record_indexing(repo_id, duration, function_count)
        metrics.get_metrics()  # dashboard-friendly summary
        metrics.get_stats()    # raw counters/timings/gauges
    """
    
    def __init__(self) -> None:
        self._counters: Dict[str, int] = {}
        self._timings: Dict[str, list] = {}
        self._gauges: Dict[str, float] = {}
        # Domain-specific tracking (replaces PerformanceMetrics)
        self._indexing_times: deque = deque(maxlen=100)
        self._search_times: deque = deque(maxlen=100)
        self._total_searches: int = 0
        self._cache_hits: int = 0
        self._cache_misses: int = 0
    
    def increment(self, name: str, value: int = 1, **tags) -> None:
        """Increment a counter"""
        self._counters[name] = self._counters.get(name, 0) + value
    
    def timing(self, name: str, value_ms: float) -> None:
        """Record a timing measurement"""
        if name not in self._timings:
            self._timings[name] = []
        self._timings[name].append(value_ms)
        if len(self._timings[name]) > 1000:
            self._timings[name] = self._timings[name][-1000:]
    
    def gauge(self, name: str, value: float) -> None:
        """Record a point-in-time value"""
        self._gauges[name] = value
    
    def record_indexing(self, repo_id: str, duration: float, function_count: int) -> None:
        """Record indexing performance for dashboard metrics."""
        self._indexing_times.append({
            "repo_id": repo_id,
            "duration": duration,
            "function_count": function_count,
            "speed": function_count / duration if duration > 0 else 0,
            "timestamp": datetime.now().isoformat(),
        })
    
    def record_search(self, duration: float, cached: bool) -> None:
        """Record search performance for dashboard metrics."""
        self._search_times.append({
            "duration": duration,
            "cached": cached,
            "timestamp": datetime.now().isoformat(),
        })
        self._total_searches += 1
        if cached:
            self._cache_hits += 1
        else:
            self._cache_misses += 1
    
    def get_metrics(self) -> Dict:
        """Dashboard-friendly performance summary (used by /health and /metrics)."""
        indexing_speeds = [m["speed"] for m in self._indexing_times]
        search_durations = [m["duration"] for m in self._search_times]
        cache_hit_rate = (
            (self._cache_hits / self._total_searches * 100)
            if self._total_searches > 0 else 0
        )
        
        return {
            "indexing": {
                "total_operations": len(self._indexing_times),
                "avg_speed_functions_per_sec": (
                    sum(indexing_speeds) / len(indexing_speeds)
                    if indexing_speeds else 0
                ),
                "max_speed": max(indexing_speeds) if indexing_speeds else 0,
                "min_speed": min(indexing_speeds) if indexing_speeds else 0,
                "recent_operations": list(self._indexing_times)[-10:],
            },
            "search": {
                "total_searches": self._total_searches,
                "cache_hit_rate": f"{cache_hit_rate:.1f}%",
                "cache_hits": self._cache_hits,
                "cache_misses": self._cache_misses,
                "avg_duration_ms": (
                    sum(search_durations) / len(search_durations) * 1000
                    if search_durations else 0
                ),
                "recent_searches": list(self._search_times)[-10:],
            },
            "summary": {
                "health": "healthy",
                "cache_working": cache_hit_rate > 0,
                "indexing_performance": (
                    "good" if (
                        sum(indexing_speeds) / len(indexing_speeds)
                        if indexing_speeds else 0
                    ) > 10 else "needs_improvement"
                ),
            },
        }
    
    def get_stats(self) -> Dict:
        """Raw counters, timings, and gauges for internal debugging."""
        stats = {
            "counters": self._counters.copy(),
            "gauges": self._gauges.copy(),
            "timings": {},
        }
        for name, values in self._timings.items():
            if values:
                stats["timings"][name] = {
                    "count": len(values),
                    "avg_ms": round(sum(values) / len(values), 2),
                    "min_ms": round(min(values), 2),
                    "max_ms": round(max(values), 2),
                }
        return stats
    
    def reset(self) -> None:
        """Reset all metrics"""
        self._counters = {}
        self._timings = {}
        self._gauges = {}
        self._indexing_times.clear()
        self._search_times.clear()
        self._total_searches = 0
        self._cache_hits = 0
        self._cache_misses = 0


# SENTRY INITIALIZATION (moved from services/sentry.py)

def init_sentry() -> bool:
    """Initialize Sentry SDK if SENTRY_DSN is configured."""
    sentry_dsn = os.getenv("SENTRY_DSN")

    if not sentry_dsn:
        print("[INFO] Sentry DSN not configured - error tracking disabled")
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration

        environment = os.getenv("ENVIRONMENT", "development")

        # PII and debug settings -- opt-in via env vars, default to safe
        send_pii = os.getenv("SENTRY_SEND_PII", "false").lower() in ("true", "1")
        include_locals = os.getenv("SENTRY_INCLUDE_LOCAL_VARS", "false").lower() in ("true", "1")

        sentry_sdk.init(
            dsn=sentry_dsn,
            environment=environment,
            traces_sample_rate=0.1 if environment == "production" else 1.0,
            profiles_sample_rate=0.1 if environment == "production" else 1.0,
            send_default_pii=send_pii,
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                StarletteIntegration(transaction_style="endpoint"),
            ],
            before_send=_filter_events,
            debug=environment == "development",
            attach_stacktrace=True,
            include_local_variables=include_locals,
        )

        print(f"[OK] Sentry initialized (environment: {environment})")
        return True

    except ImportError:
        print("[WARN] sentry-sdk not installed - error tracking disabled")
        return False
    except Exception as e:
        print(f"[WARN] Failed to initialize Sentry: {e}")
        return False


def _filter_events(event: Dict[str, Any], hint: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Filter out noisy events before sending to Sentry."""
    request_url = event.get("request", {}).get("url", "")
    if "/health" in request_url:
        return None

    exception_values = event.get("exception", {}).get("values", [])
    if exception_values:
        exception_value = str(exception_values[0].get("value", ""))
        bot_paths = ["/wp-admin", "/wp-login", "/.env", "/config", "/admin", "/phpmyadmin", "/.git"]
        if any(path in exception_value for path in bot_paths):
            return None

    if exception_values:
        exception_type = exception_values[0].get("type", "")
        if exception_type in ("RequestValidationError", "ValidationError"):
            return None

    return event


def set_user_context(user_id: Optional[str] = None, email: Optional[str] = None) -> None:
    """Set Sentry user context for error attribution."""
    try:
        import sentry_sdk
        sentry_sdk.set_user({"id": user_id, "email": email})
    except ImportError:
        pass


def capture_http_exception(request: Any, exc: Exception, status_code: int) -> None:
    """Capture HTTP exception with request context for Sentry."""
    try:
        import sentry_sdk
        with sentry_sdk.push_scope() as scope:
            scope.set_extra("status_code", status_code)
            scope.set_extra("path", str(request.url.path))
            scope.set_extra("method", request.method)
            sentry_sdk.capture_exception(exc)
    except ImportError:
        pass


# Global instances
metrics = Metrics()
