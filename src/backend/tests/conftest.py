"""
Pytest configuration and fixtures for the test suite.

This module provides all the necessary fixtures for testing the FastAPI application
with async SQLAlchemy integration. It handles database setup, session management,
and test data creation.
"""

import asyncio
import os
from typing import AsyncGenerator, Generator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy import event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
    AsyncEngine,
)
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.security import create_access_token
from app.database import Base, get_db
from app.main import app as main_app
from app.models import User, Company, Department, DepartmentRequest, Role, Permission
from app.models.department_request import RequestStatus, RequestPriority, RequestType

# Use a separate test database with file-based SQLite in memory with shared cache
# This allows the same in-memory database to be accessed from multiple connections
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:?cache=shared"

# Create test engine with NullPool for SQLite in-memory database
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,  # Set to True for SQL query logging
    future=True,
    poolclass=NullPool,  # Required for SQLite in-memory with async
    connect_args={"check_same_thread": False},
)

# Create async session factory for tests
TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

# ==============================================================================
# Database Setup and Teardown
# ==============================================================================

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Create a new database session for a test with setup and teardown.

    This fixture uses a single connection to:
    1. Create all tables.
    2. Begin a transaction for the test.
    3. Yield the session.
    4. Rollback the transaction.
    5. Drop all tables.
    This unified approach prevents race conditions with in-memory databases.
    """
    async with test_engine.connect() as connection:
        await connection.run_sync(Base.metadata.create_all)
        
        transaction = await connection.begin()
        session = TestingSessionLocal(bind=connection)

        try:
            yield session
        finally:
            await session.close()
            await transaction.rollback()
            
            # Drop tables within the same connection context
            # Start a new transaction for the teardown DDL
            await connection.run_sync(Base.metadata.drop_all)

# ==============================================================================
# Test Client Fixtures
# ==============================================================================

@pytest.fixture(scope="function")
async def async_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Create a test client for making HTTP requests to the FastAPI application.
    
    This fixture overrides the database dependency to use the test database
    session and provides an AsyncClient for making requests to the application.
    """
    # Override the get_db dependency to use our test session
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        try:
            yield db_session
        finally:
            # Don't close the session here, let the db_session fixture handle it
            pass
    
    # Apply the override
    main_app.dependency_overrides[get_db] = override_get_db
    
    # Create and return the test client
    async with AsyncClient(app=main_app, base_url="http://test") as client:
        yield client
    
    # Clean up overrides
    main_app.dependency_overrides.clear()

# ==============================================================================
# Test Data Fixtures
# ==============================================================================

@pytest.fixture(scope="function")
async def test_company(db_session: AsyncSession) -> Company:
    """Create and return a test company."""
    company = Company(
        name="Test Company",
        description="A test company for unit testing",
        is_active=True,
    )
    db_session.add(company)
    await db_session.commit()
    await db_session.refresh(company)
    return company

@pytest.fixture(scope="function")
async def test_department(
    db_session: AsyncSession, test_company: Company
) -> Department:
    """Create and return a test department."""
    department = Department(
        name="Test Department",
        description="A test department for unit testing",
        company_id=test_company.id,
        is_active=True,
    )
    db_session.add(department)
    await db_session.commit()
    await db_session.refresh(department)
    return department

@pytest.fixture(scope="function")
async def test_user(db_session: AsyncSession, test_department: Department) -> User:
    """Create and return a test user."""
    user = User(
        email="testuser@example.com",
        hashed_password="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password = "testpass"
        full_name="Test User",
        is_active=True,
        is_superuser=False,
        department_id=test_department.id,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
async def test_superuser(db_session: AsyncSession, test_department: Department) -> User:
    """Create and return a test superuser."""
    user = User(
        email="admin@example.com",
        hashed_password="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password = "testpass"
        full_name="Admin User",
        is_active=True,
        is_superuser=True,
        department_id=test_department.id,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
async def test_department_request(
    db_session: AsyncSession, test_user: User, test_department: Department
) -> DepartmentRequest:
    """Create and return a test department request."""
    request = DepartmentRequest(
        title="Test Request",
        description="A test department request",
        status=RequestStatus.DRAFT,
        priority=RequestPriority.MEDIUM,
        request_type=RequestType.OTHER,
        requester_id=test_user.id,
        department_id=test_department.id,
    )
    db_session.add(request)
    await db_session.commit()
    await db_session.refresh(request)
    return request

# ==============================================================================
# Authentication Fixtures
# ==============================================================================

@pytest.fixture(scope="function")
def test_password() -> str:
    """Return a test password."""
    return "testpass"

@pytest.fixture(scope="function")
async def test_token(test_user: User) -> str:
    """Generate a JWT token for the test user."""
    return create_access_token(subject=test_user.id)

@pytest.fixture(scope="function")
async def test_superuser_token(test_superuser: User) -> str:
    """Generate a JWT token for the test superuser."""
    return create_access_token(subject=test_superuser.id)

@pytest.fixture(scope="function")
async def auth_headers(test_token: str) -> dict[str, str]:
    """Return authorization headers with a valid JWT token."""
    return {"Authorization": f"Bearer {test_token}"}

@pytest.fixture(scope="function")
async def superuser_auth_headers(test_superuser_token: str) -> dict[str, str]:
    """Return authorization headers with a valid superuser JWT token."""
    return {"Authorization": f"Bearer {test_superuser_token}"}

# ==============================================================================
# Test Configuration
# ==============================================================================

def pytest_configure(config):
    """Configure pytest with custom markers and settings."""
    # Register custom markers
    config.addinivalue_line(
        "markers",
        "async_test: mark test as async (using pytest-asyncio)",
    )
    config.addinivalue_line(
        "markers",
        "db_test: mark test as requiring database access",
    )

# Ensure all tests have the async_test marker
# This helps catch tests that aren't properly marked as async
def pytest_collection_modifyitems(config, items):
    """Ensure all async tests are properly marked with pytest.mark.asyncio."""
    for item in items:
        if "async" in item.fixturenames or "_async" in item.name:
            item.add_marker(pytest.mark.asyncio)

# ==============================================================================
# Database Configuration
# ==============================================================================

# Use the SQLALCHEMY_DATABASE_URL from settings for consistency
SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///:memory:?cache=shared"

# Update the test engine with proper configuration
test_engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=False,  # Set to True for SQL query logging
    future=True,
    poolclass=NullPool,  # Required for SQLite in-memory with async
    connect_args={"check_same_thread": False},
)

# Update the session maker with proper configuration
TestingSessionLocal = sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)
