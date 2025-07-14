"""
Test database manager for Department Request API tests.

This module provides utilities for managing the test database lifecycle,
ensuring proper schema creation and isolation between tests.
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

# Import Base and all models to ensure they're registered with the metadata
from app.db.base import Base
from app.models import *  # Import all models to ensure they're registered with the metadata

class _DatabaseManager:
    """
    Manages test database lifecycle with proper schema creation
    """
    
    def __init__(self):
        # Store Base for table creation
        self.Base = Base
        
        # Use in-memory SQLite for tests
        self.database_url = "sqlite+aiosqlite:///:memory:"
        self.engine = create_async_engine(
            self.database_url,
            poolclass=StaticPool,
            connect_args={"check_same_thread": False},
            echo=False  # Set to True for SQL debugging
        )
        self.async_session = async_sessionmaker(
            bind=self.engine,
            class_=AsyncSession,
            expire_on_commit=False
        )

    async def create_tables(self):
        """Create all tables with updated schema"""
        async with self.engine.begin() as conn:
            # Drop all tables first to ensure clean state
            await conn.run_sync(Base.metadata.drop_all)
            # Create all tables with current schema
            await conn.run_sync(Base.metadata.create_all)

    async def get_session(self):
        """Get a database session for testing"""
        async with self.async_session() as session:
            yield session

    async def close(self):
        """Clean up database connection"""
        await self.engine.dispose()

# Global test database manager
test_db_manager = _DatabaseManager()

@pytest.fixture(scope="session")
async def setup_test_database():
    """Set up test database for the entire test session"""
    await test_db_manager.create_tables()
    yield
    await test_db_manager.close()

@pytest.fixture
async def db_session(setup_test_database):
    """Provide a database session for each test"""
    async with test_db_manager.async_session() as session:
        try:
            yield session
        finally:
            await session.rollback()
