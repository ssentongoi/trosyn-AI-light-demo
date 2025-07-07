"""Pytest configuration and fixtures for the test suite."""
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
import asyncio
from contextlib import asynccontextmanager

from app.main import app
from app.database import Base, get_db
from app.models.user import User
from app.models.role import Role, Permission
from app.core.config import settings

# Test database setup - use aiosqlite for async SQLite in memory
SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create test engine with NullPool for SQLite in-memory database
test_engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=True,
    future=True,
    poolclass=NullPool,  # Use NullPool for SQLite in-memory
    connect_args={"check_same_thread": False}
)

# Create async session factory for tests
TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False
)

# Create test database tables
@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="function", autouse=True)
async def create_test_database():
    """Create test database tables and drop them after the test."""
    try:
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        yield
    finally:
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await test_engine.dispose()

# Database session fixture
@pytest.fixture(scope="function")
async def db_session():
    """Create a new database session with a rollback at the end of the test."""
    async with test_engine.connect() as connection:
        # Begin a transaction
        transaction = await connection.begin()
        
        # Create a session bound to this connection
        session = TestingSessionLocal(bind=connection)
        
        try:
            yield session
        finally:
            # Clean up session
            await session.close()
            
            # Rollback the transaction
            if transaction.is_active:
                await transaction.rollback()
            
            # Close the connection
            await connection.close()

# Async test client
@pytest.fixture(scope="function")
async def async_client(db_session):
    """Create a test client with async database session."""
    async def override_get_db():
        try:
            yield db_session
        finally:
            # Don't close the session here, let the fixture handle it
            pass

    # Override the database dependency
    app.dependency_overrides[get_db] = override_get_db
    
    # Create test client
    async with TestClient(app) as client:
        yield client
    
    # Clear overrides
    app.dependency_overrides.clear()

# Sync test client for compatibility with existing tests
@pytest.fixture(scope="function")
def client(async_client):
    """Synchronous test client for backward compatibility."""
    return async_client

# Test user fixtures
@pytest.fixture(scope="function")
async def test_user(db_session):
    """Create a test user."""
    user = User(
        username="testuser",
        email="test@example.com",
        full_name="Test User",
        hashed_password="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password = "secret"
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

# Test role fixtures
@pytest.fixture(scope="function")
async def test_role(db_session):
    """Create a test role."""
    role = Role(name="test_role", description="Test Role")
    db_session.add(role)
    await db_session.commit()
    await db_session.refresh(role)
    return role

# Test permission fixtures
@pytest.fixture(scope="function")
async def test_permission(db_session):
    """Create a test permission."""
    permission = Permission(
        name="test_permission", 
        description="Test Permission",
        resource="test_resource",
        action="read"
    )
    db_session.add(permission)
    await db_session.commit()
    await db_session.refresh(permission)
    return permission
