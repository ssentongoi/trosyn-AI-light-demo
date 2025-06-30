import os
import sys
import logging
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from dotenv import load_dotenv

# Add the backend directory to Python path
BACKEND_DIR = Path(__file__).parent.parent
sys.path.append(str(BACKEND_DIR))

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)

logger = logging.getLogger(__name__)

# Load environment variables from .env file
env_path = BACKEND_DIR.parent / '.env'
load_dotenv(dotenv_path=env_path)
logger.info(f"Loaded environment from: {env_path}")

# Import local modules after path setup
from app.core.config import settings
from app.database import engine, create_tables
from app.db.base import Base  # Import Base from db.base to avoid circular imports

# Import API routers
from app.api.v1.endpoints import auth
from app.api.v1.endpoints import testing  # Assuming testing is also in the endpoints directory

# Create all database tables
create_tables()

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for Trosyn AI - Offline-first, self-hosted AI assistant platform",
    version="0.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
from app.api.v1.api import api_router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Trosyn AI API"}

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    
    # Log the full exception with traceback
    logger.error(
        f"Unhandled exception: {str(exc)}\n"
        f"Path: {request.url.path}\n"
        f"Method: {request.method}\n"
        f"Query params: {request.query_params}\n"
        f"Headers: {dict(request.headers)}\n"
        f"Traceback: {traceback.format_exc()}",
        exc_info=True
    )
    
    # Return a 500 error with the exception details
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"An unexpected error occurred: {str(exc)}"}
    )

# Include API routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(testing.router, prefix="/api/v1/testing", tags=["testing"])

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Uvicorn server...")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,
        log_level="debug"
    )

