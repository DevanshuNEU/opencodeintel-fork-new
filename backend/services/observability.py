"""
Observability Module
Centralized logging, tracing, and metrics for CodeIntel backend.

Features:
- Structured JSON logging (prod) / Pretty logging (dev)
- Sentry integration with context management
- Performance tracking decorators
- Operation context propagation
"""
import os
import sys
import json
import time
import logging
import functools
from typing import Optional, Dict, Any, Callable
from contextlib import contextmanager
from datetime import datetime


# ============================================================================
# CONFIGURATION
# ============================================================================

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_FORMAT = os.getenv("LOG_FORMAT", "pretty" if ENVIRONMENT == "development" else "json")


# ============================================================================
# STRUCTURED LOGGER
# ============================================================================

class StructuredLogger:
    """
    Structured logger with JSON output for production and pretty output for dev.
    
    Usage:
        logger = get_logger("indexer")
        logger.info("Starting indexing", repo_id="abc", files=120)
        logger.error("Failed to index", error=str(e), repo_id="abc")
    """
    
    def __init__(self, name: str):
        self.name = name
        self.logger = logging.getLogger(name)
        self.logger.setLevel(getattr(logging, LOG_LEVEL))
        
        # Avoid duplicate handlers
        if not self.logger.handlers:
            handler = logging.StreamHandler(sys.stdout)
            handler.setFormatter(logging.Formatter('%(message)s'))
            self.logger.addHandler(handler)
    
    def _format_message(self, level: str, message: str, **kwargs) -> str:
        """Format log message based on environment"""
        timestamp = datetime.utcnow().isoformat() + "Z"
        
        if LOG_FORMAT == "json":
            log_data = {
                "timestamp": timestamp,
                "level": level,
                "logger": self.name,
                "message": message,
                **kwargs
            }
            return json.dumps(log_data)
        else:
            # Pretty format for development
            level_icons = {
                "DEBUG": "🔍",
                "INFO": "ℹ️ ",
                "WARNING": "⚠️ ",
                "ERROR": "❌",
                "CRITICAL": "🔥"
            }
            icon = level_icons.get(level, "•")
            
            extra = ""
            if kwargs:
                extra = " | " + " ".join(f"{k}={v}" for k, v in kwargs.items())
            
            return f"{icon} [{self.name}] {message}{extra}"
    
    def debug(self, message: str, **kwargs):
        self.logger.debug(self._format_message("DEBUG", message, **kwargs))
    
    def info(self, message: str, **kwargs):
        self.logger.info(self._format_message("INFO", message, **kwargs))
    
    def warning(self, message: str, **kwargs):
        self.logger.warning(self._format_message("WARNING", message, **kwargs))
    
    def error(self, message: str, **kwargs):
        self.logger.error(self._format_message("ERROR", message, **kwargs))
    
    def critical(self, message: str, **kwargs):
        self.logger.critical(self._format_message("CRITICAL", message, **kwargs))


# Logger cache
_loggers: Dict[str, StructuredLogger] = {}

def get_logger(name: str) -> StructuredLogger:
    """Get or create a structured logger"""
    if name not in _loggers:
        _loggers[name] = StructuredLogger(name)
    return _loggers[name]


# ============================================================================
# SENTRY CONTEXT MANAGEMENT
# ============================================================================

def set_operation_context(
    operation: str,
    repo_id: Optional[str] = None,
    user_id: Optional[str] = None,
    **extra
):
    """
    Set operation context for Sentry error tracking.
    
    Usage:
        set_operation_context("indexing", repo_id="abc", files=120)
    """
    try:
        import sentry_sdk
        
        sentry_sdk.set_tag("operation", operation)
        
        if repo_id:
            sentry_sdk.set_tag("repo_id", repo_id)
        if user_id:
            sentry_sdk.set_user({"id": user_id})
        
        for key, value in extra.items():
            sentry_sdk.set_extra(key, value)
            
    except ImportError:
        pass  # Sentry not installed


def add_breadcrumb(
    message: str,
    category: str = "operation",
    level: str = "info",
    **data
):
    """
    Add breadcrumb for debugging error context.
    
    Usage:
        add_breadcrumb("Cloned repository", category="git", repo_id="abc")
        add_breadcrumb("Extracted 340 functions", category="indexing")
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


@contextmanager
def operation_context(
    operation: str,
    repo_id: Optional[str] = None,
    user_id: Optional[str] = None,
    **extra
):
    """
    Context manager for operation tracking with automatic error capture.
    
    Usage:
        with operation_context("indexing", repo_id="abc") as ctx:
            # do work
            ctx.set_extra("functions_indexed", 340)
    """
    logger = get_logger(operation)
    start_time = time.time()
    
    # Set Sentry context
    set_operation_context(operation, repo_id, user_id, **extra)
    add_breadcrumb(f"Started {operation}", category=operation, repo_id=repo_id)
    
    class Context:
        def __init__(self):
            self.extras = {}
        
        def set_extra(self, key: str, value: Any):
            self.extras[key] = value
            try:
                import sentry_sdk
                sentry_sdk.set_extra(key, value)
            except ImportError:
                pass
    
    ctx = Context()
    
    try:
        logger.info(f"Starting {operation}", repo_id=repo_id, **extra)
        yield ctx
        
        duration = time.time() - start_time
        logger.info(
            f"Completed {operation}",
            repo_id=repo_id,
            duration_s=round(duration, 2),
            **ctx.extras
        )
        add_breadcrumb(
            f"Completed {operation}",
            category=operation,
            duration_s=round(duration, 2)
        )
        
    except Exception as e:
        duration = time.time() - start_time
        logger.error(
            f"Failed {operation}",
            repo_id=repo_id,
            error=str(e),
            duration_s=round(duration, 2),
            **ctx.extras
        )
        
        # Capture to Sentry with full context
        try:
            import sentry_sdk
            with sentry_sdk.push_scope() as scope:
                scope.set_extra("duration_s", round(duration, 2))
                for key, value in ctx.extras.items():
                    scope.set_extra(key, value)
                sentry_sdk.capture_exception(e)
        except ImportError:
            pass
        
        raise


# ============================================================================
# PERFORMANCE TRACKING
# ============================================================================

def track_performance(operation_name: Optional[str] = None):
    """
    Decorator to track function performance with Sentry spans.
    
    Usage:
        @track_performance("embedding_generation")
        async def generate_embeddings(texts):
            ...
    """
    def decorator(func: Callable):
        name = operation_name or func.__name__
        
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            logger = get_logger(name)
            start_time = time.time()
            
            try:
                # Try to create Sentry span
                try:
                    import sentry_sdk
                    with sentry_sdk.start_span(op=name, description=name) as span:
                        result = await func(*args, **kwargs)
                        span.set_data("success", True)
                        return result
                except ImportError:
                    return await func(*args, **kwargs)
                    
            except Exception as e:
                duration = time.time() - start_time
                logger.error(f"{name} failed", error=str(e), duration_s=round(duration, 2))
                raise
            finally:
                duration = time.time() - start_time
                if duration > 5.0:  # Log slow operations
                    logger.warning(f"{name} slow", duration_s=round(duration, 2))
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            logger = get_logger(name)
            start_time = time.time()
            
            try:
                try:
                    import sentry_sdk
                    with sentry_sdk.start_span(op=name, description=name) as span:
                        result = func(*args, **kwargs)
                        span.set_data("success", True)
                        return result
                except ImportError:
                    return func(*args, **kwargs)
                    
            except Exception as e:
                duration = time.time() - start_time
                logger.error(f"{name} failed", error=str(e), duration_s=round(duration, 2))
                raise
            finally:
                duration = time.time() - start_time
                if duration > 5.0:
                    logger.warning(f"{name} slow", duration_s=round(duration, 2))
        
        # Return appropriate wrapper based on function type
        if asyncio_iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator


def asyncio_iscoroutinefunction(func):
    """Check if function is async"""
    import asyncio
    return asyncio.iscoroutinefunction(func)


# ============================================================================
# METRICS (Simple counters - can be extended to Prometheus later)
# ============================================================================

class Metrics:
    """
    Simple in-memory metrics counters.
    Can be extended to push to Prometheus/StatsD later.
    """
    
    def __init__(self):
        self._counters: Dict[str, int] = {}
        self._gauges: Dict[str, float] = {}
        self._histograms: Dict[str, list] = {}
    
    def increment(self, name: str, value: int = 1, **tags):
        """Increment a counter"""
        key = self._make_key(name, tags)
        self._counters[key] = self._counters.get(key, 0) + value
    
    def gauge(self, name: str, value: float, **tags):
        """Set a gauge value"""
        key = self._make_key(name, tags)
        self._gauges[key] = value
    
    def histogram(self, name: str, value: float, **tags):
        """Record a histogram value"""
        key = self._make_key(name, tags)
        if key not in self._histograms:
            self._histograms[key] = []
        self._histograms[key].append(value)
        # Keep only last 1000 values
        if len(self._histograms[key]) > 1000:
            self._histograms[key] = self._histograms[key][-1000:]
    
    def _make_key(self, name: str, tags: Dict) -> str:
        if not tags:
            return name
        tag_str = ",".join(f"{k}={v}" for k, v in sorted(tags.items()))
        return f"{name}{{{tag_str}}}"
    
    def get_stats(self) -> Dict:
        """Get all metrics for debugging/monitoring endpoint"""
        return {
            "counters": self._counters.copy(),
            "gauges": self._gauges.copy(),
            "histograms": {
                k: {
                    "count": len(v),
                    "avg": sum(v) / len(v) if v else 0,
                    "min": min(v) if v else 0,
                    "max": max(v) if v else 0
                }
                for k, v in self._histograms.items()
            }
        }


# Global metrics instance
metrics = Metrics()


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

def capture_exception(error: Exception, **context):
    """
    Capture exception to Sentry with additional context.
    
    Usage:
        try:
            risky_operation()
        except Exception as e:
            capture_exception(e, repo_id="abc", operation="indexing")
    """
    logger = get_logger("error")
    logger.error("Exception captured", error=str(error), **context)
    
    try:
        import sentry_sdk
        with sentry_sdk.push_scope() as scope:
            for key, value in context.items():
                scope.set_extra(key, value)
            sentry_sdk.capture_exception(error)
    except ImportError:
        pass


def capture_message(message: str, level: str = "info", **context):
    """
    Capture a message to Sentry.
    
    Usage:
        capture_message("Unusual pattern detected", level="warning", pattern="...")
    """
    logger = get_logger("message")
    getattr(logger, level)(message, **context)
    
    try:
        import sentry_sdk
        with sentry_sdk.push_scope() as scope:
            for key, value in context.items():
                scope.set_extra(key, value)
            sentry_sdk.capture_message(message, level=level)
    except ImportError:
        pass
