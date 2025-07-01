from contextlib import asynccontextmanager
from fastapi import FastAPI
from .api.v1.api import api_router
from .auth.security import create_access_token
from .config import settings
from .discovery.service import DiscoveryService
from .logging_config import logger, setup_logging

setup_logging()

discovery_service = DiscoveryService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles startup and shutdown events for the application."""
    logger.info("Lifespan: Startup sequence initiated.")
    await discovery_service.start()
    logger.info("Lifespan: Discovery service started. Yielding to application.")
    try:
        yield
    finally:
        logger.info("Lifespan: Shutdown sequence initiated.")
        await discovery_service.stop()
        logger.info("Lifespan: Shutdown complete.")


app = FastAPI(
    title="Trosyn Sync Service",
    description="Handles data synchronization between Trosyn AI nodes on a local network.",
    version="0.1.0",
    lifespan=lifespan,
)

@app.get("/status", tags=["General"])
async def get_status():
    """Returns the current status of the sync service."""
    return {"status": "running", "node_id": discovery_service.node_id}


@app.get("/api/v1/discovery/nodes", tags=["Discovery"])
async def get_discovered_nodes():
    """Returns the list of currently discovered nodes."""
    return discovery_service.registry

app.include_router(api_router, prefix="/api/v1")


@app.post("/token", tags=["Authentication"])
async def login_for_access_token(node_id: str):
    """Generates a JWT for a given node ID (for testing)."""
    if node_id not in settings.ALLOWED_NODE_IDS:
        raise HTTPException(
            status_code=400, detail="Node ID not allowed"
        )
    access_token = create_access_token(data={"sub": node_id})
    return {"access_token": access_token, "token_type": "bearer"}
