"""
Observability Module
Unified logging, tracing, and metrics for CodeIntel backend

Features:
- Structured JSON logging (production) / Pretty logging (development)
- Sentry integration with context managers
- Performance tracking decorators
- Operation-level breadcrumbs
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
JSON_LOGS = ENVIRONMENT == "production"


# ============================================================================
# STRUCTURED LOGGER
# ============================================================================

class StructuredFormatter(logging.Formatter):
    """JSON formatter for production, pretty formatter for development"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        # Add extra fields if present
        if hasattr(record, "extra_fields"):
            log_data.update(record.extra_fields)
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        if JSON_LOGS:
            return json.dumps(log_data)
        else:
            # Pretty format for development
            extra = ""
            if hasattr(record, "extra_fields") and record.extra_fields:
                extra = " | " + " ".join(f"{k}={v}" for k, v in record.extra_fields.items())
            
            level_colors = {
                "DEBUG": "\033[36m",    # Cyan
                "INFO": "\033[32m",     # Green
                "WARNING": "\033[33m",  # Yellow
                "ERROR": "\033[31m",    # Red
                "CRITICAL": "\033[35m", # Magenta
            }
            reset = "\033[0m"
            color = level_colors.get(record.levelname, "")
            
            return f"{color}[{record.levelname}]{reset} {record.name}: {record.getMessage()}{extra}"


class ContextLogger(logging.Logger):
    """Logger that supports extra context fields"""
    
    def _log_with_context(self, level: int, msg: str, context: Dict = None, **kwargs):
        if context:
            # Create a new record with extra fields
            extra = kwargs.get("extra", {})
            extra["extra_fields"] = context
            kwargs["extra"] = extra
        super()._log(level, msg, (), **kwargs)
    
    def info(self, msg: str, context: Dict = None, **kwargs):
        self._log_with_context(logging.INFO, msg, context, **kwargs)
    
    def warning(self, msg: str, context: Dict = None, **kwargs):
        self._log_with_context(logging.WARNING, msg, context, **kwargs)
    
    def error(self, msg: str, context: Dict = None, **kwargs):
        self._log_with_context(logging.ERROR, msg, context, **kwargs)
    
    def debug(self, msg: str, context: Dict = None, **kwargs):
        self._log_with_context(logging.DEBUG, msg, context, **kwargs)


def get_logger(name: str) -> ContextLogger:
    """Get a configured logger instance"""
    logging.setLoggerClass(ContextLogger)
    logger = logging.getLogger(name)
    
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredFormatter())
        logger.addHandler(handler)
        logger.setLevel(getattr(logging, LOG_LEVEL))
    
    return logger


# ============================================================================
# SENTRY INTEGRATION
# ============================================================================

def _sentry_available() -> bool:
    """Check if Sentry is initialized"""
    try:
        import sentry_sdk
        return sentry_sdk.Hub.current.client is not None
    except ImportError:
        return False


def set_context(name: str, data: Dict[str, Any]):
    """Set Sentry context for current scope"""
    if not _sentry_available():
        return
    
    import sentry_sdk
    sentry_sdk.set_context(name, data)


def set_tag(key: str, value: str):
    """Set a tag for the current Sentry scope"""
    if not _sentry_available():
        return
    
    import sentry_sdk
    sentry_sdk.set_tag(key, value)


def add_breadcrumb(message: str, category: str = "default", level: str = "info", data: Dict = None):
    """Add a breadcrumb for debugging"""
    if not _sentry_available():
        return
    
    import sentry_sdk
    sentry_sdk.add_breadcrumb(
        message=message,
        category=category,
        level=level,
        data=data or {}
    )


def capture_exception(error: Exception, **extra_context):
    """Capture exception with extra context"""
    if not _sentry_available():
        return
    
    import sentry_sdk
    with sentry_sdk.push_scope() as scope:
        for key, value in extra_context.items():
            scope.set_extra(key, value)
        sentry_sdk.capture_exception(error)


def capture_message(message: str, level: str = "info", **extra_context):
    """Capture a message with context"""
    if not _sentry_available():
        return
    
    import sentry_sdk
    with sentry_sdk.push_scope() as scope:
        for key, value in extra_context.items():
            scope.set_extra(key, value)
        sentry_sdk.capture_message(message, level=level)


# ============================================================================
# PERFORMANCE TRACKING
# ============================================================================

@contextmanager
def trace_operation(operation_name: str, **tags):
    """
    Context manager for tracing operations with Sentry spans.
    
    Usage:
        with trace_operation("indexing", repo_id="abc"):
            # ... do work ...
    """
    logger = get_logger("trace")
    start_time = time.time()
    
    # Set tags
    for key, value in tags.items():
        set_tag(key, str(value))
    
    # Add breadcrumb
    add_breadcrumb(
        message=f"Started {operation_name}",
        category="operation",
        data=tags
    )
    
    if _sentry_available():
        import sentry_sdk
        with sentry_sdk.start_span(op=operation_name, description=operation_name) as span:
            for key, value in tags.items():
                span.set_tag(key, str(value))
            try:
                yield span
            except Exception as e:
                span.set_status("error")
                duration = time.time() - start_time
                logger.error(f"{operation_name} failed after {duration:.2f}s", context={"error": str(e), **tags})
                raise
            finally:
                duration = time.time() - start_time
                span.set_data("duration_seconds", duration)
    else:
        try:
            yield None
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"{operation_name} failed after {duration:.2f}s", context={"error": str(e), **tags})
            raise
        finally:
            duration = time.time() - start_time
            logger.debug(f"{operation_name} completed in {duration:.2f}s", context=tags)


def track_performance(operation_name: str = None):
    """
    Decorator for tracking function performance.
    
    Usage:
        @track_performance("search")
        async def search_code(query: str, repo_id: str):
            ...
    """
    def decorator(func: Callable):
        op_name = operation_name or func.__name__
        
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            with trace_operation(op_name):
                return await func(*args, **kwargs)
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            with trace_operation(op_name):
                return func(*args, **kwargs)
        
        if asyncio_iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator


def asyncio_iscoroutinefunction(func):
    """Check if function is async"""
    import asyncio
    return asyncio.iscoroutinefunction(func)


# ============================================================================
# OPERATION CONTEXT
# ============================================================================

class OperationContext:
    """
    Context manager for setting operation-level context.
    
    Usage:
        with OperationContext(operation="indexing", repo_id="abc", user_id="xyz"):
            # All errors/logs within this block have context attached
            do_indexing()
    """
    
    def __init__(self, operation: str, **context):
        self.operation = operation
        self.context = context
        self.logger = get_logger(f"op.{operation}")
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        
        # Set Sentry context
        set_context("operation", {
            "name": self.operation,
            "started_at": datetime.utcnow().isoformat(),
            **self.context
        })
        
        # Set tags for filtering
        set_tag("operation", self.operation)
        for key, value in self.context.items():
            if key in ("repo_id", "user_id"):
                set_tag(key, str(value))
        
        self.logger.info(f"Starting {self.operation}", context=self.context)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start_time
        
        if exc_type:
            self.logger.error(
                f"{self.operation} failed after {duration:.2f}s",
                context={"error": str(exc_val), "duration": duration, **self.context}
            )
            capture_exception(exc_val, operation=self.operation, duration=duration, **self.context)
        else:
            self.logger.info(
                f"{self.operation} completed in {duration:.2f}s",
                context={"duration": duration, **self.context}
            )
        
        return False  # Don't suppress exceptions
    
    def log_progress(self, message: str, **extra):
        """Log progress within operation"""
        add_breadcrumb(message, category=self.operation, data=extra)
        self.logger.info(message, context={**self.context, **extra})
    
    def log_warning(self, message: str, **extra):
        """Log warning within operation"""
        self.logger.warning(message, context={**self.context, **extra})


# ============================================================================
# METRICS (Simple counters - can be extended with Prometheus later)
# ============================================================================

class Metrics:
    """Simple in-memory metrics (singleton)"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._counters = {}
            cls._instance._gauges = {}
            cls._instance._histograms = {}
        return cls._instance
    
    def increment(self, name: str, value: int = 1, tags: Dict = None):
        """Increment a counter"""
        key = self._make_key(name, tags)
        self._counters[key] = self._counters.get(key, 0) + value
    
    def gauge(self, name: str, value: float, tags: Dict = None):
        """Set a gauge value"""
        key = self._make_key(name, tags)
        self._gauges[key] = value
    
    def histogram(self, name: str, value: float, tags: Dict = None):
        """Record a histogram value"""
        key = self._make_key(name, tags)
        if key not in self._histograms:
            self._histograms[key] = []
        self._histograms[key].append(value)
        # Keep last 1000 values
        self._histograms[key] = self._histograms[key][-1000:]
    
    def _make_key(self, name: str, tags: Dict = None) -> str:
        if not tags:
            return name
        tag_str = ",".join(f"{k}={v}" for k, v in sorted(tags.items()))
        return f"{name}{{{tag_str}}}"
    
    def get_all(self) -> Dict:
        """Get all metrics"""
        return {
            "counters": self._counters.copy(),
            "gauges": self._gauges.copy(),
            "histograms": {k: {"count": len(v), "avg": sum(v)/len(v) if v else 0} 
                          for k, v in self._histograms.items()}
        }


# Global metrics instance
metrics = Metrics()


# ============================================================================
# CONVENIENCE EXPORTS
# ============================================================================

__all__ = [
    # Logging
    "get_logger",
    
    # Sentry
    "set_context",
    "set_tag", 
    "add_breadcrumb",
    "capture_exception",
    "capture_message",
    
    # Performance
    "trace_operation",
    "track_performance",
    
    # Context
    "OperationContext",
    
    # Metrics
    "metrics",
]
