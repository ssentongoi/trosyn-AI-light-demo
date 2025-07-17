"""
Main FastAPI application for Trosyn Sync service.
"""

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from .api.endpoints import auth, documents, memory, processing, sync
from .core.discovery import get_discovery_service, initialize_discovery_service
from .db import get_db, init_db
from .middleware.security import setup_security_middleware

# Initialize logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create required directories
os.makedirs("storage/documents", exist_ok=True)
os.makedirs("storage/versions", exist_ok=True)
os.makedirs("storage/tmp", exist_ok=True)
os.makedirs("storage/memory", exist_ok=True)

# Global services
discovery_service = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager."""
    # Startup
    logger.info("Initializing database...")
    init_db()

    logger.info("Initializing discovery service...")
    discovery_service = initialize_discovery_service(
        node_type=os.getenv("NODE_TYPE", "TROSYSN_DEPT_NODE"),
        port=int(os.getenv("NODE_PORT", "8000")),
    )
    await discovery_service.start()

    yield

    # Shutdown
    logger.info("Stopping discovery service...")
    await get_discovery_service().stop()
    logger.info("Application shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="Trosyn Sync",
    description="LAN Synchronization Service for Trosyn AI",
    version="0.1.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],  # For file downloads
)

# Add security middleware (headers, rate limiting, etc.)
setup_security_middleware(app)

# Include API routers
app.include_router(auth.router)  # Auth endpoints first
app.include_router(documents.router)
app.include_router(sync.router)
app.include_router(memory.router)
app.include_router(processing.router)


@app.get("/status")
async def get_status():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "trosyn-sync",
        "version": "0.1.0",
        "node_id": os.getenv("NODE_ID", "local-node"),
    }


# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )
