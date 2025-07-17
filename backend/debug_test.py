"""
Debug script for department request test.
"""

import asyncio
import traceback

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.department_request import RequestPriority as Priority
from app.models.department_request import RequestType
from tests.test_app import test_app
from tests.test_database import test_db_manager


async def run_debug_test():
    """Run a simplified version of the test with detailed error reporting."""
    print("\n=== Starting debug test ===\n")

    # Set up database
    print("Setting up database...")
    await test_db_manager.create_tables()

    # Create a session
    print("Creating database session...")
    async with test_db_manager.async_session() as session:
        # Create test data
        print("Creating test data...")

        # Create test user
        from app.models.user import User

        user = User(
            email="test@example.com",
            username="testuser",
            hashed_password="hashed_password_here",
            full_name="Test User",
            is_active=True,
            is_superuser=False,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        print(f"Created test user with ID: {user.id}")

        # Create test company first
        from app.models.company import Company

        company = Company(
            name="Test Company", description="Test Company Description", is_active=True
        )
        session.add(company)
        await session.commit()
        await session.refresh(company)
        print(f"Created test company with ID: {company.id}")

        # Create test department with company_id
        from app.models.department import Department

        department = Department(
            name="Test Department",
            description="Test Department Description",
            company_id=company.id,  # Associate with the company
            is_active=True,
        )
        session.add(department)
        await session.commit()
        await session.refresh(department)
        print(f"Created test department with ID: {department.id}")

        # Create test client
        print("Creating test client...")
        async with AsyncClient(app=test_app, base_url="http://test") as client:
            # Create access token (mocked for test)
            access_token = "test_token"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            }

            # Prepare request data
            request_data = {
                "title": "Test Purchase Request",
                "description": "Need to purchase office supplies",
                "request_type": RequestType.EQUIPMENT.value,
                "priority": Priority.HIGH.value,
                "department_id": department.id,
            }

            print(f"Request data: {request_data}")
            print(f"Headers: {headers}")

            # Make the request
            print("\nMaking API request...")
            try:
                response = await client.post(
                    "/api/v1/department-requests/", json=request_data, headers=headers
                )

                print(f"Response status: {response.status_code}")
                print(f"Response headers: {response.headers}")
                print(f"Response body: {response.text}")

                if response.status_code != 201:
                    print(
                        f"ERROR: Expected status code 201, got {response.status_code}"
                    )
                else:
                    print("SUCCESS: Department request created successfully")

            except Exception as e:
                print(f"\nEXCEPTION DURING API REQUEST: {str(e)}")
                print(f"Exception type: {type(e)}")
                print("Traceback:")
                print(traceback.format_exc())


if __name__ == "__main__":
    asyncio.run(run_debug_test())
