import os
import sys
import logging
import asyncio
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Request, status, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.future import select
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession

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
from app.database import engine, init_db, get_db, import_models
from app.db.base import Base  # Import Base from db.base to avoid circular imports

# Import API routers and middleware
from app.api.v1.endpoints import auth, testing, roles, memory, department_requests
from app.middleware.auth_middleware import auth_middleware, get_current_user
from app.middleware.permission_middleware import PermissionChecker, has_permission
from app.models.role import Role
from app.models.permission import Permission
from app.models.user import User

# Function to create default roles and permissions
async def create_default_roles_and_permissions():
    """Create default roles and permissions if they don't exist"""
    async with AsyncSession(engine) as session:
        try:
            # Create default permissions
            permissions = [
                {"name": "user:read", "description": "Read user data", "resource": "user", "action": "read"},
                {"name": "user:write", "description": "Create/update users", "resource": "user", "action": "write"},
                {"name": "user:delete", "description": "Delete users", "resource": "user", "action": "delete"},
                {"name": "role:read", "description": "Read role data", "resource": "role", "action": "read"},
                {"name": "role:write", "description": "Create/update roles", "resource": "role", "action": "write"},
                {"name": "role:delete", "description": "Delete roles", "resource": "role", "action": "delete"},
                {"name": "permission:read", "description": "Read permission data", "resource": "permission", "action": "read"},
                {"name": "permission:assign", "description": "Assign permissions to roles", "resource": "permission", "action": "assign"},
            ]
            
            for perm_data in permissions:
                result = await session.execute(
                    select(Permission).filter(Permission.name == perm_data["name"])
                )
                perm = result.scalars().first()
                if not perm:
                    perm = Permission(**perm_data)
                    session.add(perm)
            
            await session.commit()
            
            # Create default roles
            result = await session.execute(select(Role).filter(Role.name == "admin"))
            admin_role = result.scalars().first()
            
            if not admin_role:
                admin_role = Role(
                    name="admin",
                    description="Administrator with full access"
                )
                session.add(admin_role)
                await session.commit()
                
                # Assign all permissions to admin role
                result = await session.execute(select(Permission))
                all_perms = result.scalars().all()
                admin_role.permissions = all_perms
                await session.commit()
            
            # Create default user role if it doesn't exist
            result = await session.execute(select(Role).filter(Role.name == "user"))
            user_role = result.scalars().first()
            
            if not user_role:
                user_role = Role(
                    name="user",
                    description="Regular user with basic access"
                )
                session.add(user_role)
                await session.commit()
                
                # Assign basic permissions to user role
                result = await session.execute(
                    select(Permission).filter(
                        Permission.name.in_(["user:read", "role:read", "permission:read"])
                    )
                )
                basic_perms = result.scalars().all()
                user_role.permissions = basic_perms
                await session.commit()
                
        except Exception as e:
            logger.error(f"Error creating default roles and permissions: {e}")
            await session.rollback()
            raise

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for Trosyn AI - Offline-first, self-hosted AI assistant platform",
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    on_startup=[init_db, create_default_roles_and_permissions]
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

@app.get("/", dependencies=[Depends(PermissionChecker([{"resource": "system", "action": "read"}]))])
async def read_root():
    return {"message": "Welcome to the Trosyn AI API"}

async def init_app():
    """Initialize the application and its dependencies"""
    logger.info("Initializing application...")
    
    try:
        # Import models first to ensure they're registered with SQLAlchemy
        from app.database import import_models
        import_models()
        
        # Create database tables
        from app.database import init_db
        await init_db()
        
        # Create default roles and permissions
        await create_default_roles_and_permissions()
        
        logger.info("Application initialization completed successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize application: {str(e)}", exc_info=True)
        raise

@app.on_event("startup")
async def startup_event():
    """Run tasks on application startup"""
    logger.info("Starting up...")
    try:
        await init_app()
    except Exception as e:
        logger.critical(f"Failed to start application: {str(e)}", exc_info=True)
        # In a production environment, you might want to exit the application here
        # import sys
        # sys.exit(1)

# Global exception handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(404)
async def not_found_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": "Resource not found"},
    )

@app.exception_handler(500)
async def server_error_exception_handler(request: Request, exc: HTTPException):
    logger.exception("Internal server error")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception occurred")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )

# Include API routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(testing.router, prefix="/api/v1/testing", tags=["testing"])
app.include_router(roles.router, prefix="/api/v1/roles", tags=["roles"])
app.include_router(memory.router, prefix="/api/v1/memory", tags=["memory"])
app.include_router(department_requests.router, prefix="/api/v1/department-requests", tags=["department-requests"])

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

