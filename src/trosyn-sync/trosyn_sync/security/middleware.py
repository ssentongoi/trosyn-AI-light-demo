"""Security middleware for FastAPI applications."""
import time
from typing import Callable, Optional

from fastapi import FastAPI, Request, Response
from fastapi.middleware import Middleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp

from ...config import settings

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware to add security headers to all responses."""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.security_headers = self._get_security_headers()
    
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """Add security headers to the response."""
        response = await call_next(request)
        
        # Add security headers
        for header, value in self.security_headers.items():
            if value:  # Only add non-empty headers
                response.headers[header] = value
                
        return response
    
    def _get_security_headers(self) -> dict:
        """Get the security headers to add to responses."""
        csp_policy = ""
        if settings.ENABLE_CSP:
            csp_policy = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data:; "
                "font-src 'self'; "
                "connect-src 'self'; "
                "frame-ancestors 'none'; "
                "form-action 'self'; "
                "base-uri 'self'; "
                "object-src 'none'"
            )
        
        hsts_policy = ""
        if settings.ENABLE_HSTS:
            hsts_policy = "max-age=31536000; includeSubDomains; preload"
        
        return {
            # Prevent MIME type sniffing
            "X-Content-Type-Options": "nosniff",
            
            # Basic XSS protection
            "X-XSS-Protection": "1; mode=block",
            
            # Prevent clickjacking
            "X-Frame-Options": "DENY",
            
            # Enable HSTS
            "Strict-Transport-Security": hsts_policy,
            
            # Content Security Policy
            "Content-Security-Policy": csp_policy,
            
            # Prevent embedding as an iframe
            "X-Permitted-Cross-Domain-Policies": "none",
            
            # Disable FLoC tracking
            "Permissions-Policy": "interest-cohort=()",
            
            # Referrer policy
            "Referrer-Policy": "strict-origin-when-cross-origin",
            
            # Feature policy (legacy, replaced by Permissions-Policy but kept for compatibility)
            "Feature-Policy": "geolocation 'none'; microphone 'none'; camera 'none'"
        }

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware for rate limiting requests."""
    
    def __init__(self, app: ASGIApp, limit: int = 100, window: int = 60):
        super().__init__(app)
        self.limit = limit
        self.window = window
        self.rate_limits = {}
    
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """Check rate limits before processing the request."""
        # Skip rate limiting for certain paths
        if request.url.path in ["/status", "/health"]:
            return await call_next(request)
        
        # Get client identifier (IP or API key)
        client_id = self._get_client_id(request)
        
        # Get endpoint identifier
        endpoint = f"{request.method}:{request.url.path}"
        
        # Create rate limit key
        rate_key = f"{client_id}:{endpoint}"
        
        # Check rate limit
        current_time = time.time()
        window_start = current_time - self.window
        
        # Clean up old entries
        self.rate_limits[rate_key] = [t for t in self.rate_limits.get(rate_key, []) if t > window_start]
        
        # Check if rate limit exceeded
        if len(self.rate_limits.get(rate_key, [])) >= self.limit:
            response = Response(
                content={"detail": "Too many requests"},
                status_code=429,
                media_type="application/json"
            )
            response.headers["Retry-After"] = str(self.window)
            response.headers["X-RateLimit-Limit"] = str(self.limit)
            response.headers["X-RateLimit-Remaining"] = "0"
            response.headers["X-RateLimit-Reset"] = str(int(window_start + self.window))
            return response
        
        # Add current request to rate limit
        if rate_key not in self.rate_limits:
            self.rate_limits[rate_key] = []
        self.rate_limits[rate_key].append(current_time)
        
        # Add rate limit headers to response
        response = await call_next(request)
        remaining = self.limit - len(self.rate_limits[rate_key])
        
        response.headers["X-RateLimit-Limit"] = str(self.limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))
        response.headers["X-RateLimit-Reset"] = str(int(window_start + self.window))
        
        return response
    
    def _get_client_id(self, request: Request) -> str:
        """Get a unique identifier for the client."""
        # Try to get API key from header
        api_key = request.headers.get("X-API-Key")
        if api_key:
            return f"api_key:{api_key}"
        
        # Fall back to IP address
        x_forwarded_for = request.headers.get("X-Forwarded-For")
        if x_forwarded_for:
            # Get the first IP in the X-Forwarded-For header
            client_ip = x_forwarded_for.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"
        
        return f"ip:{client_ip}"

def setup_security_middleware(app: FastAPI) -> None:
    """Set up security middleware for the FastAPI application."""
    # Add security headers middleware
    app.add_middleware(SecurityHeadersMiddleware)
    
    # Add rate limiting middleware
    app.add_middleware(
        RateLimitMiddleware,
        limit=settings.RATE_LIMIT_REQUESTS,
        window=settings.RATE_LIMIT_WINDOW,
    )
    
    # Add HTTPS redirect middleware if in production
    if settings.ENVIRONMENT == "production" and settings.ENABLE_HSTS:
        app.add_middleware(HTTPSRedirectMiddleware)
    
    # Add CORS middleware
    from fastapi.middleware.cors import CORSMiddleware
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.TRUSTED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
    )
