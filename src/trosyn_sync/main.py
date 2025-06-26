"""
Main FastAPI application for Trosyn Sync service.
"""
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from .core.discovery import DiscoveryService
from .db import init_db, get_db
from .api.endpoints import sync, documents

# Initialize logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create required directories
os.makedirs("storage/documents", exist_ok=True)
os.makedirs("storage/versions", exist_ok=True)
os.makedirs("storage/tmp", exist_ok=True)

# Global services
discovery_service = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager."""
    # Startup
    logger.info("Initializing database...")
    init_db()
    
    # Initialize discovery service
    global discovery_service
    discovery_service = DiscoveryService(
        node_type=os.getenv("NODE_TYPE", "TROSYSN_DEPT_NODE"),
        port=int(os.getenv("NODE_PORT", "8000")),
    )
    await discovery_service.start()
    
    yield
    
    # Shutdown
    if discovery_service:
        await discovery_service.stop()
    logger.info("Application shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="Trosyn Sync",
    description="LAN Synchronization Service for Trosyn AI",
    version="0.1.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(sync.router)
app.include_router(documents.router)

@app.get("/status")
async def get_status():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "trosyn-sync",
        "version": "0.1.0",
        "node_id": os.getenv("NODE_ID", "local-node")
    }

# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"}
    )

# Dependency for getting the discovery service
def get_discovery_service() -> DiscoveryService:
    """Get the discovery service instance."""
    return discovery_service
