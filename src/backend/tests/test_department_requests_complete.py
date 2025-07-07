"""
Complete test suite for Department Request API endpoints.

This module provides comprehensive test coverage for the Department Request API,
including success cases, validation errors, and edge cases.
"""
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from typing import AsyncGenerator, Dict, Any, Generator
from sqlalchemy import select, text
from datetime import datetime, timedelta
import asyncio

# Standard library imports
import logging
import os
import sys
from pathlib import Path
from typing import AsyncGenerator

# Third-party imports
import pytest
import pytest_asyncio
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool

# Add the backend directory to Python path
BACKEND_DIR = Path(__file__).parent.parent
sys.path.append(str(BACKEND_DIR))

# Import test app and models
from app.db.base import Base  # Import Base from db.base
from app.models import (
    DepartmentRequest, 
    Company, 
    Department, 
    User,
    Role,
    Permission,
    Notification,
    RequestComment,
    RequestAttachment,
    RequestHistory,
    Document,
    ChatMessage,
    ChatConversation
)
from app.schemas.department_request import RequestStatus, RequestType, RequestPriority
from app.core.security import create_access_token, get_password_hash
from app.database import (
    get_db, 
    DATABASE_URL, 
    import_models, 
    create_tables, 
    drop_db, 
    init_db,
    engine as app_engine
)
from app.core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import all model modules to ensure they are registered with SQLAlchemy
from app.models import (
    chat,
    company,
    department,
    department_request,
    document,
    memory,
    notification,
    permission,
    role,
    user
)

# Test data constants
TEST_COMPANY = {
    "name": "Test Company",
    "description": "Test Company Description",
    "is_active": True
}

TEST_DEPARTMENT = {
    "name": "Test Department",
    "description": "Test Department Description",
    "is_active": True
}

TEST_USER = {
    "email": "testuser@example.com",
    "username": "testuser",
    "full_name": "Test User",
    "password": "testpassword123",
    "is_active": True,
    "is_superuser": False
}

# Ensure all models are imported and registered with SQLAlchemy
import_models()  # This will register all models with SQLAlchemy

# Test database setup
TEST_SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Override the database URL for testing
os.environ["DATABASE_URL"] = TEST_SQLALCHEMY_DATABASE_URL

# Configure test engine
test_engine = create_async_engine(
    TEST_SQLALCHEMY_DATABASE_URL,
    echo=True,
    future=True,
    poolclass=NullPool,
    connect_args={
        "check_same_thread": False, 
        "timeout": 30.0, 
        "uri": True,
        "isolation_level": None  # Let SQLAlchemy handle transactions
    }
)

# Override the app's engine with our test engine
app_engine = test_engine

# Ensure all models are imported and registered with SQLAlchemy
import_models()

# Create all tables before running tests
@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    """Create all database tables before running tests."""
    # Drop all tables if they exist
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    # Create all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    logger.info("Test database tables created successfully")
    
    yield  # Wait for tests to complete
    
    # Clean up after tests
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    logger.info("Test database tables dropped")

# Import all models to ensure they are registered with SQLAlchemy
from app.models import *  # noqa

# Create test session factory
TestingSessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Test data
TEST_COMPANY = {
    "name": "TestCo",
    "description": "A test company"
}

TEST_DEPARTMENT = {
    "name": "Engineering",
    "description": "Engineering Department"
}

TEST_USER = {
    "email": "test.user@testco.com",
    "username": "testuser",
    "full_name": "Test User",
    "password": "testpassword123",
    "is_active": True,
    "is_superuser": False
}

# Override the get_db dependency
async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        yield session

# Create test app
from app.main import app
app.dependency_overrides[get_db] = override_get_db
pytestmark = pytest.mark.asyncio

@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database session for each test."""
    # Create a new async session for testing
    TestingSessionLocal = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False
    )
    
    # Create a new session
    session = TestingSessionLocal()
    
    # Begin a transaction
    await session.begin()
    
    try:
        yield session
        await session.rollback()  # Always rollback after test
    finally:
        await session.close()
    
    # Create a new session for testing
    async with TestingSessionLocal() as session:
        try:
            # Ensure all models are properly registered
            import_models()
            
            # Create initial test data
            from app.models import Company, Department, User, Role, Permission
            
            # Create test company
            company = Company(
                name="Test Company",
                description="Test Company Description",
                is_active=True
            )
            session.add(company)
            await session.flush()
            
            # Create test department
            department = Department(
                name="Test Department",
                company_id=company.id,
                is_active=True
            )
            session.add(department)
            await session.flush()
            
            # Create test user
            user = User(
                email="test@example.com",
                hashed_password=get_password_hash("testpassword"),
                full_name="Test User",
                is_active=True,
                company_id=company.id,
                department_id=department.id
            )
            session.add(user)
            await session.flush()
            
            # Commit all test data
            await session.commit()
            
            # Refresh objects to ensure we have the latest data
            await session.refresh(company)
            await session.refresh(department)
            await session.refresh(user)
            
            # Yield the session with test data
            yield session
            
        except Exception as e:
            await session.rollback()
            raise e
        finally:
            await session.close()
    

@pytest_asyncio.fixture(scope="function")
async def test_client():
    """Create a test client for making HTTP requests."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest_asyncio.fixture(scope="function")
async def test_data(db_session: AsyncSession, test_client: AsyncClient) -> Dict[str, Any]:
    """
    Creates all necessary test data for department request tests.
    - Creates a Company.
    - Creates a Department associated with the Company.
    - Creates a User associated with both.
    - Generates authentication headers for the User.
    """
    # 1. Create a company
    company = Company(**TEST_COMPANY)
    db_session.add(company)
    await db_session.commit()
    await db_session.refresh(company)

    # 2. Create a department linked to the company
    department = Department(
        **TEST_DEPARTMENT,
        company_id=company.id,
    )
    db_session.add(department)
    await db_session.commit()
    await db_session.refresh(department)

    # 3. Create a user linked to the company and department
    user = User(
        email=TEST_USER["email"],
        username=TEST_USER["username"],
        full_name=TEST_USER["full_name"],
        hashed_password=get_password_hash(TEST_USER["password"]),
        is_active=TEST_USER["is_active"],
        is_superuser=TEST_USER["is_superuser"],
        company_id=company.id,
        department_id=department.id,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    # 4. Create access token and headers
    access_token = create_access_token(data={"sub": user.email})
    headers = {"Authorization": f"Bearer {access_token}"}

    return {
        "user": user,
        "department": department,
        "company": company,
        "headers": headers,
        "test_client": test_client
    }

@pytest.mark.asyncio
async def test_create_department_request_success(
    test_data: Dict[str, Any]
):
    """Test successful creation of a department request."""
    print("\n=== Starting test_create_department_request_success ===")
    
    # Print test data for debugging
    print(f"Test user ID: {test_data['user'].id}")
    print(f"Department ID: {test_data['department'].id}")
    print(f"Auth headers: {test_data['headers']}")
    
    request_payload = {
        "title": "New High-Performance Laptops",
        "description": "Request for 3 new laptops for the dev team.",
        "request_type": RequestType.EQUIPMENT.value,
        "priority": RequestPriority.HIGH.value,
        "department_id": test_data["department"].id,
    }
    
    print(f"\nSending request with payload: {request_payload}")

    # Make the request
    test_client = test_data["test_client"]
    response = await test_client.post(
        "/api/v1/department-requests/",
        json=request_payload,
        headers=test_data["headers"],
    )
    
    print(f"\nResponse status: {response.status_code}")
    print(f"Response headers: {response.headers}")
    print(f"Response body: {response.text}")

    # Check status code first
    assert response.status_code == 201, f"Expected 201, got {response.status_code}. Response: {response.text}"
    
    # Parse response
    try:
        data = response.json()
        print(f"\nParsed response data: {data}")
    except Exception as e:
        print(f"Failed to parse JSON response: {e}")
        raise
    
    # Validate response data
    print("\nValidating response data...")
    assert data["title"] == request_payload["title"], f"Title mismatch: {data['title']} != {request_payload['title']}"
    assert data["description"] == request_payload["description"], f"Description mismatch"
    assert data["request_type"] == request_payload["request_type"], f"Request type mismatch"
    assert data["priority"] == request_payload["priority"], f"Priority mismatch"
    assert data["status"] == RequestStatus.DRAFT.value, f"Status is not DRAFT: {data['status']}"
    assert data["department_id"] == request_payload["department_id"], f"Department ID mismatch"
    assert data["requester_id"] == test_data["user"].id, f"Requester ID mismatch: {data['requester_id']} != {test_data['user'].id}"
    assert "id" in data, "Missing ID in response"
    
    # Verify the record was created in the database
    stmt = select(DepartmentRequest).where(DepartmentRequest.id == data["id"])
    result = await db_session.execute(stmt)
    db_request = result.scalar_one_or_none()
    assert db_request is not None, "Request not found in database"
    print(f"\nFound request in database with ID: {db_request.id}")
    
    print("\n=== test_create_department_request_success completed successfully ===")
    assert "created_at" in data
    assert "updated_at" in data
    assert data["approver"] is None

async def test_get_department_request_success(
    test_client: AsyncClient,
    db_session: AsyncSession,
    test_data: Dict[str, Any]
):
    """Test successful retrieval of a department request."""
    # First, create a request to retrieve
    request = DepartmentRequest(
        title="Existing Request",
        description="An existing request for testing retrieval.",
        request_type=RequestType.MAINTENANCE.value,
        priority=Priority.MEDIUM.value,
        status=RequestStatus.PENDING.value,
        department_id=test_data["department"].id,
        requester_id=test_data["user"].id,
    )
    db_session.add(request)
    await db_session.commit()
    await db_session.refresh(request)

    response = await test_client.get(
        f"/api/v1/department-requests/{request.id}",
        headers=test_data["headers"],
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == request.id
    assert data["title"] == request.title
    assert data["description"] == request.description
    assert data["request_type"] == request.request_type
    assert data["priority"] == request.priority
    assert data["status"] == request.status
    assert data["department_id"] == request.department_id
    assert data["requester_id"] == request.requester_id
    assert "created_at" in data
    assert "updated_at" in data
    assert data["approver"] is None

async def test_create_department_request_validation_errors(
    test_client: AsyncClient,
    test_data: Dict[str, Any],
    db_session: AsyncSession
):
    """Test validation errors for department request creation"""

    # Test missing required fields
    response = await test_client.post(
        "/api/v1/department-requests/",
        json={},
        headers=test_data["headers"]
    )

    assert response.status_code == 422
    response_data = response.json()
    assert "detail" in response_data
    
    # Verify validation error details
    errors = {error["loc"][-1]: error["msg"] for error in response_data["detail"]}
    assert "title" in errors
    assert "description" in errors
    assert "request_type" in errors
    assert "priority" in errors
    assert "department_id" in errors

    # Test invalid request type
    response = await test_client.post(
        "/api/v1/department-requests/",
        json={
            "title": "Test Request",
            "description": "Test Description",
            "request_type": "invalid_type",
            "priority": Priority.HIGH.value,
            "department_id": test_data["department"].id
        },
        headers=test_data["headers"]
    )
    assert response.status_code == 422

    # Test invalid priority
    response = await test_client.post(
        "/api/v1/department-requests/",
        json={
            "title": "Test Request",
            "description": "Test Description",
            "request_type": RequestType.PURCHASE.value,
            "priority": "invalid_priority",
            "department_id": test_data["department"].id
        },
        headers=test_data["headers"]
    )
    assert response.status_code == 422

    # Test invalid department_id (non-existent)
    response = await test_client.post(
        "/api/v1/department-requests/",
        json={
            "title": "Test Request",
            "description": "Test Description",
            "request_type": RequestType.PURCHASE.value,
            "priority": Priority.HIGH.value,
            "department_id": 99999  # Non-existent department
        },
        headers=test_data["headers"]
    )
    assert response.status_code in [404, 422]  # Could be either depending on your API design

async def test_get_department_request_success(
    test_client: AsyncClient,
    db_session: AsyncSession,
    test_data: Dict[str, Any]
):
    """Test successful retrieval of department request"""

    # First create a department request
    create_response = await test_client.post(
        "/api/v1/department-requests/",
        json={
            "title": "Test Request",
            "description": "Test Description",
            "request_type": RequestType.PURCHASE.value,
            "priority": Priority.HIGH.value,
            "department_id": test_data["department"].id
        },
        headers=test_data["headers"]
    )

    assert create_response.status_code == 201
    created_request = create_response.json()

    # Now retrieve it
    get_response = await test_client.get(
        f"/api/v1/department-requests/{created_request['id']}",
        headers=test_data["headers"]
    )

    assert get_response.status_code == 200
    retrieved_request = get_response.json()

    # Verify all fields match
    assert retrieved_request["id"] == created_request["id"]
    assert retrieved_request["title"] == created_request["title"]
    assert retrieved_request["description"] == created_request["description"]
    assert retrieved_request["request_type"] == created_request["request_type"]
    assert retrieved_request["priority"] == created_request["priority"]
    assert retrieved_request["department_id"] == created_request["department_id"]
    assert retrieved_request["requester_id"] == created_request["requester_id"]
    assert retrieved_request["status"] == created_request["status"]

async def test_get_department_request_not_found(
    test_client: AsyncClient,
    test_data: Dict[str, Any]
):
    """Test 404 error for non-existent department request"""

    response = await test_client.get(
        "/api/v1/department-requests/99999",
        headers=test_data["headers"]
    )

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

async def test_unauthorized_access(
    test_client: AsyncClient,
    db_session: AsyncSession
):
    """Test that requests without proper authentication are rejected"""
    
    # Test without Authorization header
    response = await test_client.post(
        "/api/v1/department-requests/",
        json={
            "title": "Test Request",
            "description": "Test Description",
            "request_type": RequestType.PURCHASE.value,
            "priority": Priority.HIGH.value,
            "department_id": 1
        }
    )
    assert response.status_code == 401

    # Test with invalid token
    response = await test_client.post(
        "/api/v1/department-requests/",
        json={
            "title": "Test Request",
            "description": "Test Description",
            "request_type": RequestType.PURCHASE.value,
            "priority": Priority.HIGH.value,
            "department_id": 1
        },
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401