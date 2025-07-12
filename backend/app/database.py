import os
import sys
import logging
from typing import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv

# Import Base from db.base to avoid circular imports
from app.db.base import Base

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Database URL from environment or default to SQLite with explicit aiosqlite driver
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./trosyn_ai.db")

# Ensure we're using aiosqlite for SQLite connections
if DATABASE_URL.startswith("sqlite:"):
    if "aiosqlite" not in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("sqlite:", "sqlite+aiosqlite:", 1)

# Special handling for SQLite
if "sqlite" in DATABASE_URL:
    # Ensure the directory exists for SQLite file
    db_path = DATABASE_URL.split("///")[-1]
    if db_path != ":memory:" and "/" in db_path:
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    # Configure SQLite connection arguments
    connect_args = {
        "check_same_thread": False,
        "timeout": 30.0,
        "uri": True,
        "isolation_level": None  # Let SQLAlchemy handle transactions
    }
    
    # Use NullPool for SQLite to prevent connection sharing issues
    poolclass = NullPool
else:
    connect_args = {}
    poolclass = None

# Create async SQLAlchemy engine
engine = create_async_engine(
    DATABASE_URL,
    echo=True,  # Enable SQL query logging
    future=True,
    pool_pre_ping=True,
    pool_recycle=300,
    poolclass=poolclass,
    connect_args=connect_args
)

# Async session factory
async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get async DB session."""
    session = async_session_factory()
    try:
        yield session
        await session.commit()
    except Exception as e:
        await session.rollback()
        logger.error(f"Database error: {str(e)}", exc_info=True)
        raise
    finally:
        await session.close()

async def init_db():
    """Initialize database tables"""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        raise

async def drop_db():
    """Drop all database tables (for testing)"""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        logger.info("Database tables dropped successfully")
    except Exception as e:
        logger.error(f"Error dropping database tables: {str(e)}")
        raise

def import_models():
    """
    Import all models to ensure they are registered with SQLAlchemy.
    This function must be called after all models are defined.
    """
    from sqlalchemy.orm import configure_mappers
    
    # Import all models here to ensure they are registered with SQLAlchemy
    try:
        # Import models in the order specified in models/__init__.py
        # This order has been verified to work correctly
        from app.models import Notification
        logger.info("✓ Imported Notification model")
        
        from app.models import User
        logger.info("✓ Imported User model")
        
        from app.models import Company
        logger.info("✓ Imported Company model")
        
        from app.models import Department
        logger.info("✓ Imported Department model")
        
        from app.models import Role
        logger.info("✓ Imported Role model")
        
        from app.models import Permission
        logger.info("✓ Imported Permission model")
        
        from app.models import Document
        logger.info("✓ Imported Document model")
        
        logger.info("All models imported successfully")
        
        # Configure all mappers after all models are loaded
        logger.info("Configuring SQLAlchemy mappers...")
        configure_mappers()
        logger.info("SQLAlchemy mappers configured successfully")
        
    except Exception as e:
        logger.error(f"Error during model import or configuration: {str(e)}")
        raise

async def create_tables():
    """Create all database tables"""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}")
        raise

# Note: The async init_db function is defined above
# For backward compatibility with non-async code, use:
# import asyncio
# asyncio.run(init_db())
