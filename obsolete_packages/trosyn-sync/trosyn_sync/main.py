from contextlib import asynccontextmanager
from datetime import timedelta
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from typing import Optional

from .api.v1.api import api_router
from .auth.security import create_access_token, verify_token, check_rate_limit
from .config import settings
from .discovery import DiscoveryService, get_discovery_service
from .logging_config import logger, setup_logging
from .middleware.security_headers import setup_security_middleware

# Initialize logging
setup_logging()

# Initialize services
discovery_service = DiscoveryService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles startup and shutdown events for the application."""
    # Validate required security settings
    if not settings.SECRET_KEY or settings.SECRET_KEY == "":
        logger.error("SECRET_KEY is not set. Please set a secure secret key in your environment.")
        raise ValueError("SECRET_KEY is required for JWT token generation")
        
    if not settings.SYNC_TOKEN or settings.SYNC_TOKEN == "":
        logger.warning("SYNC_TOKEN is not set. Using a default token is not recommended in production.")
    
    logger.info("Lifespan: Startup sequence initiated.")
    
    try:
        await discovery_service.start()
        logger.info("Lifespan: Discovery service started. Yielding to application.")
        yield
    except Exception as e:
        logger.error(f"Error during application startup: {str(e)}")
        raise
    finally:
        logger.info("Lifespan: Shutdown sequence initiated.")
        try:
            await discovery_service.stop()
            logger.info("Lifespan: Discovery service stopped.")
        except Exception as e:
            logger.error(f"Error during discovery service shutdown: {str(e)}")
        logger.info("Lifespan: Shutdown complete.")


# Create FastAPI application
app = FastAPI(
    title="Trosyn Sync Service",
    description="Handles data synchronization between Trosyn AI nodes on a local network.",
    version="0.1.0",
    docs_url="/docs" if settings.LOG_LEVEL == "DEBUG" else None,
    redoc_url="/redoc" if settings.LOG_LEVEL == "DEBUG" else None,
    openapi_url="/openapi.json" if settings.LOG_LEVEL == "DEBUG" else None,
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
)

# Add security headers middleware
setup_security_middleware(app)

# Add global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler that catches all unhandled exceptions."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )

# Health check endpoint (no authentication required)
@app.get("/status", tags=["General"])
async def get_status():
    """Returns the current status of the sync service."""
    return {
        "status": "running",
        "node_id": discovery_service.node_id,
        "version": app.version,
        "environment": "development" if settings.LOG_LEVEL == "DEBUG" else "production",
    }

# Discovery endpoint (protected by authentication)
@app.get(
    "/api/v1/discovery/nodes",
    tags=["Discovery"],
    dependencies=[Depends(verify_token)],
)
async def get_discovered_nodes():
    """Returns the list of currently discovered nodes."""
    return discovery_service.registry

# Include API routers
app.include_router(api_router, prefix="/api/v1")

# Token generation endpoint (protected by sync token)
@app.post("/token", tags=["Authentication"])
async def login_for_access_token(
    node_id: str,
    request: Request,
    x_sync_token: Optional[str] = None,
):
    """
    Generates an access token for the specified node.
    
    This endpoint is protected by the SYNC_TOKEN and is rate limited.
    """
    # Check sync token
    if not x_sync_token or x_sync_token != settings.SYNC_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing sync token",
        )
    
    # Rate limiting
    client_id = request.client.host if request.client else "unknown"
    rate_key = f"token_gen:{client_id}"
    
    if not check_rate_limit(request, rate_key, 10, 60):  # 10 requests per minute
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many token generation requests. Please try again later.",
            headers={"Retry-After": "60"},
        )
    
    # Generate token with expiration
    access_token = create_access_token(
        data={"sub": node_id},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # in seconds
    }
