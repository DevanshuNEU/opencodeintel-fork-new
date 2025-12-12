"""
Sentry Error Tracking Integration
Provides production error visibility and performance monitoring.

For logging and context management, use observability module:
    from services.observability import get_logger, operation_context, capture_exception
"""
import os
from typing import Optional


def init_sentry() -> bool:
    """
    Initialize Sentry SDK if SENTRY_DSN is configured.
    
    Returns:
        bool: True if Sentry was initialized, False otherwise
    """
    sentry_dsn = os.getenv("SENTRY_DSN")
    
    if not sentry_dsn:
        print("ℹ️  Sentry DSN not configured - error tracking disabled")
        return False
    
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
        
        environment = os.getenv("ENVIRONMENT", "development")
        
        sentry_sdk.init(
            dsn=sentry_dsn,
            environment=environment,
            
            # Performance monitoring
            traces_sample_rate=0.1 if environment == "production" else 1.0,
            profiles_sample_rate=0.1,
            
            # Send PII for debugging
            send_default_pii=True,
            
            # Integrations
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                StarletteIntegration(transaction_style="endpoint"),
            ],
            
            # Filter noisy events
            before_send=_filter_events,
            
            # Debug in development
            debug=environment == "development",
        )
        
        print(f"✅ Sentry initialized (environment: {environment})")
        return True
        
    except ImportError:
        print("⚠️  sentry-sdk not installed - error tracking disabled")
        return False
    except Exception as e:
        print(f"⚠️  Failed to initialize Sentry: {e}")
        return False


def _filter_events(event, hint):
    """Filter out noisy events before sending to Sentry."""
    # Don't send health check errors
    request_url = event.get("request", {}).get("url", "")
    if "/health" in request_url:
        return None
    
    # Don't send 404s for bot paths
    if event.get("exception"):
        values = event["exception"].get("values", [{}])
        if values:
            exception_value = str(values[0].get("value", ""))
            bot_paths = ["/wp-admin", "/wp-login", "/.env", "/config", "/admin", "/phpmyadmin"]
            if any(path in exception_value for path in bot_paths):
                return None
    
    return event


# ============================================================================
# BACKWARD COMPATIBILITY - Delegate to observability module
# ============================================================================

def set_user_context(user_id: Optional[str] = None, email: Optional[str] = None):
    """Set user context for error tracking."""
    try:
        import sentry_sdk
        sentry_sdk.set_user({"id": user_id, "email": email})
    except ImportError:
        pass


# Re-export from observability for convenience
from services.observability import (
    capture_exception,
    capture_message,
    set_operation_context,
    add_breadcrumb,
    operation_context,
    get_logger,
    metrics,
    track_performance,
)

__all__ = [
    "init_sentry",
    "set_user_context",
    "capture_exception",
    "capture_message",
    "set_operation_context",
    "add_breadcrumb",
    "operation_context",
    "get_logger",
    "metrics",
    "track_performance",
]
