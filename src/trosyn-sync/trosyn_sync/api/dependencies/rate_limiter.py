from fastapi import Request, HTTPException, status
from typing import Optional
import ipaddress

from ...config import settings
from ...auth.security import check_rate_limit

class RateLimiter:
    """Dependency for rate limiting API endpoints."""
    
    def __init__(self, limit: Optional[int] = None, window: Optional[int] = None):
        """
        Initialize rate limiter.
        
        Args:
            limit: Maximum number of requests allowed in the time window
            window: Time window in seconds
        """
        self.limit = limit or settings.RATE_LIMIT_REQUESTS
        self.window = window or settings.RATE_LIMIT_WINDOW
    
    async def __call__(self, request: Request) -> None:
        """Check if the request should be rate limited."""
        # Get client IP address
        client_ip = request.client.host if request.client else "unknown"
        
        # Get endpoint path
        endpoint = request.url.path
        
        # Create a rate limit key
        rate_key = f"rate_limit:{client_ip}:{endpoint}"
        
        # Check rate limit
        if not check_rate_limit(request, rate_key, self.limit, self.window):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "rate_limit_exceeded",
                    "message": f"Too many requests. Please try again in {self.window} seconds.",
                    "limit": self.limit,
                    "window_seconds": self.window
                },
                headers={
                    "Retry-After": str(self.window),
                    "X-RateLimit-Limit": str(self.limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(self.window)
                }
            )
        
        # Add rate limit headers to response
        remaining = self.limit - len(request.app.state._rate_limits.get(rate_key, []))
        request.scope["rate_limit_remaining"] = remaining
        request.scope["rate_limit_reset"] = self.window
