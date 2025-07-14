"""
Test application factory for Department Request API tests.

This module provides a FastAPI application specifically for testing with
overridden dependencies and routers.
"""

from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import AsyncGenerator

from app.database import get_db, Base, engine
from app.core.security import get_current_user, get_current_active_user, get_password_hash
from app.api.v1.endpoints.department_requests import router as department_requests_router
from app.api.v1.endpoints.auth import router as auth_router
from app.models.user import User
from app.models.department import Department
from app.models.company import Company
from app.models.department_request import DepartmentRequest
from app.core.config import settings

# Test user data
TEST_USER_EMAIL = "test.user@testco.com"
TEST_USER_PASSWORD = "testpassword123"

import pytest
from app.models.user import User
from app.database import get_db
import uuid

@pytest.fixture(autouse=True)
def clean_users_table():
    # This fixture will run before each test
    from sqlalchemy.orm import Session
    db = next(get_db())
    db.query(User).delete()
    db.commit()
    yield
    db.rollback()

# OAuth2 scheme for testing
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Dependency overrides
async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    """Override for database session dependency."""
    async with AsyncSession(engine, expire_on_commit=False) as session:
        async with session.begin():
            yield session

async def override_get_current_user() -> User:
    """Override for current user dependency."""
    # Create a test user if it doesn't exist
    async with AsyncSession(engine) as session:
        # Check if company exists
        result = await session.execute(
            select(Company).where(Company.name == "TestCo")
        )
        company = result.scalar_one_or_none()
        
        if not company:
            company = Company(name="TestCo", description="Test Company")
            session.add(company)
            await session.commit()
            await session.refresh(company)
        
        # Check if department exists
        result = await session.execute(
            select(Department).where(Department.name == "Engineering")
        )
        department = result.scalar_one_or_none()
        
        if not department:
            department = Department(
                name="Engineering", 
                description="Engineering Department",
                company_id=company.id
            )
            session.add(department)
            await session.commit()
            await session.refresh(department)
        
        # Get or create test user
        result = await session.execute(
            select(User).where(User.email == TEST_USER_EMAIL)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            unique_id = uuid.uuid4().hex[:8]
            user = User(
                email=f"user_{unique_id}@test.com",
                username=f"user_{unique_id}",
                full_name=f"Test User {unique_id}",
                hashed_password=get_password_hash(TEST_USER_PASSWORD),
                is_active=True,
                is_superuser=False,
                company_id=company.id,
                department_id=department.id
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
    
    return user

async def override_get_current_active_user(
    current_user: User = Depends(override_get_current_user)
) -> User:
    """Override for current active user dependency."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def create_test_data() -> None:
    """Create test data in the database."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create test user and related data
    await override_get_current_user()

async def drop_test_data() -> None:
    """Drop all test data from the database."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


def create_test_app() -> FastAPI:
    """
    Create a FastAPI test app with dependency overrides for DB and auth.
    """
    # Create test database tables
    import asyncio
    asyncio.run(create_test_data())
    
    # Configure test app
    app = FastAPI(title="Test API")

    # Apply overrides
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_current_active_user] = override_get_current_active_user

    # Include routers
    app.include_router(
        department_requests_router,
        prefix="/api/v1/department-requests",
        tags=["department-requests"]
    )
    
    app.include_router(
        auth_router,
        prefix="/api/v1/auth",
        tags=["auth"]
    )

    # Add cleanup on app shutdown
    @app.on_event("shutdown")
    async def cleanup():
        await drop_test_data()
        await engine.dispose()

    return app

# Create the app instance for use in test clients
test_app = create_test_app()
