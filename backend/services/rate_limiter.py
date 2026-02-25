"""
Rate Limiting & API Key Management
Prevents abuse and manages request quotas
"""
import time
from typing import Optional, Dict, Callable
from datetime import datetime
from functools import wraps
import hashlib
import secrets
from dataclasses import dataclass
from fastapi import HTTPException, Request


# In-memory rate limit storage (per-process, resets on restart)
_rate_limit_store: Dict[str, list] = {}
_last_cleanup: float = 0.0
_CLEANUP_INTERVAL_SEC = 60


def rate_limit(requests_per_minute: int = 60):
    """
    Simple rate limit decorator for FastAPI routes.
    Uses in-memory storage - suitable for single-instance deployments.
    For production, use Redis-backed RateLimiter class instead.
    
    IMPORTANT: Routes using this decorator MUST include `request: Request` as
    a parameter. For correct client IP detection behind a reverse proxy, 
    configure Uvicorn with:
        --proxy-headers --forwarded-allow-ips="<your-proxy-ips>"
    This ensures request.client.host reflects the real client IP from 
    X-Forwarded-For header, not the proxy's IP.
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get Request from kwargs (FastAPI injects it by parameter name)
            request = kwargs.get('request')
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
            
            if not request or not isinstance(request, Request):
                raise HTTPException(
                    status_code=500,
                    detail="Rate limiting requires Request parameter in route"
                )
            
            # Get client IP (relies on Uvicorn proxy-headers config for real IP)
            client_id = request.client.host if request.client else "unknown"
            
            key = f"{func.__name__}:{client_id}"
            now = time.time()
            window_start = now - 60
            
            # Periodic cleanup of stale keys to prevent unbounded memory growth
            global _last_cleanup
            if now - _last_cleanup > _CLEANUP_INTERVAL_SEC:
                for k in list(_rate_limit_store.keys()):
                    timestamps = _rate_limit_store.get(k, [])
                    if not timestamps or timestamps[-1] <= window_start:
                        _rate_limit_store.pop(k, None)
                _last_cleanup = now
            
            # Clean old entries and get current count
            if key not in _rate_limit_store:
                _rate_limit_store[key] = []
            
            _rate_limit_store[key] = [t for t in _rate_limit_store[key] if t > window_start]
            
            if len(_rate_limit_store[key]) >= requests_per_minute:
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded. Max {requests_per_minute} requests per minute."
                )
            
            _rate_limit_store[key].append(now)
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


@dataclass
class RateLimit:
    """Rate limit configuration"""
    requests_per_minute: int = 60
    requests_per_hour: int = 1000
    requests_per_day: int = 10000


@dataclass
class APIKey:
    """API Key with usage tracking"""
    key: str
    name: str
    tier: str  # 'free', 'pro', 'enterprise'
    created_at: datetime
    requests_today: int = 0
    last_request_time: float = 0
    request_count_minute: int = 0
    request_count_hour: int = 0


class RateLimiter:
    """Redis-backed rate limiter"""
    
    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.limits = {
            'free': RateLimit(requests_per_minute=20, requests_per_hour=200, requests_per_day=1000),
            'pro': RateLimit(requests_per_minute=100, requests_per_hour=2000, requests_per_day=20000),
            'enterprise': RateLimit(requests_per_minute=500, requests_per_hour=10000, requests_per_day=100000)
        }
    
    def check_rate_limit(self, api_key: str, tier: str = 'free') -> tuple[bool, Optional[str]]:
        """Check if request is within rate limits"""
        if not self.redis:
            return True, None
        
        limit = self.limits.get(tier, self.limits['free'])
        now = time.time()
        
        # Keys for different time windows
        minute_key = f"ratelimit:{api_key}:minute:{int(now / 60)}"
        hour_key = f"ratelimit:{api_key}:hour:{int(now / 3600)}"
        day_key = f"ratelimit:{api_key}:day:{int(now / 86400)}"
        
        # Check minute limit
        minute_count = self.redis.incr(minute_key)
        if minute_count == 1:
            self.redis.expire(minute_key, 60)
        
        if minute_count > limit.requests_per_minute:
            return False, f"Rate limit exceeded: {limit.requests_per_minute} requests/minute"
        
        # Check hour limit
        hour_count = self.redis.incr(hour_key)
        if hour_count == 1:
            self.redis.expire(hour_key, 3600)
        
        if hour_count > limit.requests_per_hour:
            return False, f"Rate limit exceeded: {limit.requests_per_hour} requests/hour"
        
        # Check day limit
        day_count = self.redis.incr(day_key)
        if day_count == 1:
            self.redis.expire(day_key, 86400)
        
        if day_count > limit.requests_per_day:
            return False, f"Rate limit exceeded: {limit.requests_per_day} requests/day"
        
        return True, None
    
    def get_usage(self, api_key: str) -> Dict:
        """Get current usage stats"""
        if not self.redis:
            return {}
        
        now = time.time()
        minute_key = f"ratelimit:{api_key}:minute:{int(now / 60)}"
        hour_key = f"ratelimit:{api_key}:hour:{int(now / 3600)}"
        day_key = f"ratelimit:{api_key}:day:{int(now / 86400)}"
        
        return {
            "requests_this_minute": int(self.redis.get(minute_key) or 0),
            "requests_this_hour": int(self.redis.get(hour_key) or 0),
            "requests_today": int(self.redis.get(day_key) or 0)
        }


class APIKeyManager:
    """Manage API keys with Supabase"""
    
    def __init__(self, supabase_client):
        self.db = supabase_client
    
    def generate_key(self, name: str, tier: str = 'free', user_id: Optional[str] = None) -> str:
        """Generate a new API key"""
        # Generate secure random key
        key = f"ci_{secrets.token_urlsafe(32)}"
        
        # Store in database
        self.db.table("api_keys").insert({
            "key_hash": hashlib.sha256(key.encode()).hexdigest(),
            "name": name,
            "tier": tier,
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        
        return key
    
    def verify_key(self, api_key: str) -> Optional[Dict]:
        """Verify API key and return metadata"""
        if not api_key or not api_key.startswith('ci_'):
            return None
        
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        result = self.db.table("api_keys").select("*").eq("key_hash", key_hash).eq("active", True).execute()
        
        return result.data[0] if result.data else None
    
    def revoke_key(self, api_key: str) -> bool:
        """Revoke an API key"""
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        self.db.table("api_keys").update({"active": False}).eq("key_hash", key_hash).execute()
        return True
