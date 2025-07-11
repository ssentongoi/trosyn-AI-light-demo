from fastapi import Request, Response
from fastapi.middleware import Middleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp

from ..config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware to add security headers to all responses."""
    
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        
        # Add security headers
        headers = {
            # Prevent MIME type sniffing
            "X-Content-Type-Options": "nosniff",
            # Basic XSS protection
            "X-XSS-Protection": "1; mode=block",
            # Prevent clickjacking
            "X-Frame-Options": "DENY",
            # Enable strict transport security
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains" if settings.ENABLE_HSTS else "",
            # Content Security Policy
            "Content-Security-Policy": "default-src 'self'; script-src 'self'; object-src 'none';" if settings.ENABLE_CSP else "",
            # Prevent embedding as an iframe
            "X-Permitted-Cross-Domain-Policies": "none",
            # Disable FLoC tracking
            "Permissions-Policy": "interest-cohort=()",
        }
        
        # Add headers to response
        for header, value in headers.items():
            if value:  # Only add non-empty headers
                response.headers[header] = value
                
        return response


def setup_security_middleware(app: ASGIApp) -> None:
    """Set up security-related middleware."""
    # Add security headers middleware
    app.add_middleware(SecurityHeadersMiddleware)
    
    # Add HTTPS redirect middleware if enabled
    if settings.ENABLE_HSTS:
        app.add_middleware(HTTPSRedirectMiddleware)
