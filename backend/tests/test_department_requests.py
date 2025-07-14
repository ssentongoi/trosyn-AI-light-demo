"""
Integration tests for the Department Request API endpoints.

This file rebuilds the test suite from scratch to ensure a clean, reliable, and maintainable set of tests for the department request functionality.
"""

import os
import asyncio
import pytest
import pytest_asyncio
from typing import AsyncGenerator, Dict, Any, List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from fastapi import FastAPI
from fastapi.routing import APIRoute
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool

# Import security utilities
from app.core.security import get_password_hash, create_access_token, get_current_user, get_current_active_user

# Import Base and all necessary models in the correct order
from app.db.base import Base
from app.database import get_db

# Import models in dependency order to prevent relationship errors
from app.models.company import Company
from app.models.department import Department
# Import all memory-related models required by the User model
from app.models.memory import MemoryInteraction, MemoryContext, MemorySession
from app.models.user import User
from app.models.department_request import (
    DepartmentRequest,
    RequestStatus,
    RequestPriority,
    RequestType,
)

# Simplified schemas for testing - avoids serialization issues with relationships
class SimpleDepartmentRequestSchema(BaseModel):
    """Simplified department request schema for testing."""
    id: int
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    request_type: str
    department_id: int
    requester_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None  # Make optional to avoid validation errors
    
    class Config:
        orm_mode = True

class DepartmentRequestResponseSchema(BaseModel):
    """Simplified response schema for testing."""
    success: bool = True
    data: SimpleDepartmentRequestSchema

# --- Test Setup ---

# Set a flag to indicate we are in a testing environment
os.environ["TESTING"] = "True"

# Use a separate file-based SQLite database for tests to ensure isolation
# and allow for easier inspection of test data if needed.
test_db_path = os.path.join(os.path.dirname(__file__), "test_requests.sqlite")
# Set the database URL environment variable for the app to use
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{test_db_path}"

# Import the FastAPI app instance *after* setting the DATABASE_URL
from app.main import app

# Define a fake authenticated user for tests to bypass real authentication
async def override_get_current_user():
    """Override the get_current_user dependency for tests"""
    user = User(
        id=1,
        username="test.user",
        email="test.user@example.com",
        full_name="Test User",
        is_active=True,
        is_superuser=False,
        department_id=1  # Associate user with department_id=1
    )
    # Set departments attribute for permission checks
    user.departments = [1]  # List of department IDs the user belongs to
    return user

async def override_get_current_active_user():
    """Override the get_current_active_user dependency for tests"""
    return await override_get_current_user()

# Override authentication dependencies to bypass real DB lookup
app.dependency_overrides[get_current_user] = override_get_current_user
app.dependency_overrides[get_current_active_user] = override_get_current_active_user

# Define the test database URL for our test-specific engine
TEST_DATABASE_URL = os.getenv("DATABASE_URL")
print(f"Using test database at: {TEST_DATABASE_URL}")

# Create a new async engine for the tests
engine = create_async_engine(
    TEST_DATABASE_URL,
    poolclass=NullPool,  # Recommended for async SQLite
    connect_args={"check_same_thread": False}, # Required for SQLite
)

# Create a sessionmaker for the test engine
TestingSessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# --- Fixtures ---

# Dependency override for getting a DB session in the app
async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency override for FastAPI to use the test database session.
    """
    async with TestingSessionLocal() as session:
        yield session

# Apply the dependency override to the FastAPI app for all tests in this file
app.dependency_overrides[get_db] = override_get_db

# Mark all tests in this module as asyncio to be run by pytest-asyncio
pytestmark = pytest.mark.asyncio


@pytest.fixture(scope="module")
def event_loop():
    """Create an instance of the default event loop for each test module."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="function")
async def setup_db(event_loop):
    """
    Function-scoped fixture to ensure a clean database for each test.
    It drops and recreates all tables before each test runs.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest_asyncio.fixture(scope="module")
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """
    Fixture that provides an AsyncClient for making API requests to the test app.
    """
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture(scope="function")
async def db_session(setup_db) -> AsyncGenerator[AsyncSession, None]:
    """
    Function-scoped fixture to provide a database session for each test.
    The underlying database is reset by the `setup_db` fixture for isolation.
    """
    async with TestingSessionLocal() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def test_data(db_session: AsyncSession) -> Dict[str, Any]:
    """
    Fixture to create and save common test data into the database.
    This includes a company, a department, and a user.
    """
    # Create and save a test company
    company = Company(name="Test Company Inc.", is_active=True)
    db_session.add(company)
    await db_session.flush()

    # Create and save a test department
    department = Department(
        name="Engineering",
        description="The best department.",
        company_id=company.id,
        is_active=True
    )
    db_session.add(department)
    await db_session.flush()

    # Create and save a test user, ensuring all required fields are present
    user = User(
        email="test.user@example.com",
        username="test.user", # This field is required
        hashed_password=get_password_hash("a_secure_password"),
        full_name="Test User",
        is_active=True,
        is_superuser=False,
        company_id=company.id,
        department_id=department.id
    )
    db_session.add(user)
    await db_session.commit() # Commit to save all data and assign IDs

    # Generate an access token for the test user
    access_token = create_access_token(data={"sub": user.email})

    return {
        "company": company,
        "department": department,
        "user": user,
        "access_token": access_token,
        "headers": {"Authorization": f"Bearer {access_token}"}
    }


# --- Test Cases ---

# Add this debugging code to the test file right before the test case
print("Available routes:")
for route in app.routes:
    if hasattr(route, "methods"):
        print(f"  {route.path} - {route.methods}")
    else:
        print(f"  {route.path} - (WebSocket)")

# Also verify the dependency override is correctly applied
print("Dependency overrides:", app.dependency_overrides)

async def test_minimal_create_department_request(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_data: Dict[str, Any]
):
    """Simple test to verify the endpoint can be reached."""
    # Create test data
    request_data = {
        "title": "Test Department Request", # Longer title to meet min_length=5
        "description": "This is a test department request",
        "request_type": "equipment",  # Must match RequestType enum values
        "priority": "high",
        "department_id": test_data["department"].id
        # No requester_email in schema - it's derived from the authenticated user
    }
    
    # Print debug info for reference
    print(f"\nAvailable app routes:\n{[str(route) for route in app.routes]}")
    
    # Send request to the endpoint
    response = await async_client.post("/api/v1/department-requests/", json=request_data)
    
    # Debug info
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.text}")
    
    # Assert response is successful
    assert response.status_code == 201, f"Failed to create department request. Response: {response.text}"
    
    # Parse and validate response data
    response_data = response.json()
    
    # Just verify the response contains data and success flag for now
    # This approach is more robust since we don't need to access lazy-loaded relationships
    assert "data" in response_data, "Response missing 'data' field"
    assert "success" in response_data, "Response missing 'success' field"
    assert response_data["success"] is True, "Response indicates failure"
    
    # Access the data field containing the DepartmentRequest object
    department_request = response_data["data"]
    
    # Verify required fields are present and correct in response
    assert "id" in department_request, "Response missing 'id' field"
    assert "title" in department_request, "Response missing 'title' field"
    assert department_request["title"] == request_data["title"], "Title doesn't match input"
    assert department_request["description"] == request_data["description"], "Description doesn't match input"
    assert department_request["request_type"] == request_data["request_type"], "Request type doesn't match input"
    assert department_request["priority"] == request_data["priority"], "Priority doesn't match input"
    assert department_request["status"] == "draft", "New department request should have draft status"  # Note: status is lowercase in schema
    assert "created_at" in department_request, "Response missing 'created_at' field"
    assert "updated_at" in department_request, "Response missing 'updated_at' field"

    # Return the created department request ID for use in other tests
    return response_data["id"]
