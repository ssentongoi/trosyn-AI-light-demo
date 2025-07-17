import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.security import create_access_token
from app.database import get_db
from app.db.base import Base
from app.main import app
from app.models.user import User

# Use an in-memory SQLite database for testing to ensure isolation
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestingSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# This dependency override ensures that the application uses the test database session
# for the duration of the test.
async def override_get_db() -> AsyncSession:
    async with TestingSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function")
async def async_client() -> AsyncClient:
    """Pytest fixture to set up the database and provide an async test client."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
async def db_session() -> AsyncSession:
    """Pytest fixture to provide a database session for test setup."""
    async with TestingSessionLocal() as session:
        yield session


@pytest.mark.asyncio
async def test_llm_chat(async_client: AsyncClient, db_session: AsyncSession):
    """Test the full end-to-end chat endpoint with JWT authentication."""
    # 1. Arrange: Create a test user directly in the test database
    test_user = User(
        email="testuser@example.com",
        username="testuser",
        hashed_password="not-a-real-password",
        is_active=True,
        is_superuser=False,
    )
    db_session.add(test_user)
    await db_session.commit()
    await db_session.refresh(test_user)

    # 2. Arrange: Create an access token for the test user
    access_token = create_access_token(data={"sub": test_user.username})
    headers = {"Authorization": f"Bearer {access_token}"}

    # 3. Act: Make the authenticated request to the chat endpoint
    response = await async_client.post(
        "/api/v1/chat/chat",
        headers=headers,
        json={"message": "Hello, LLM!", "stream": False},
    )

    # 4. Assert: Verify the response is successful and contains the expected data
    assert (
        response.status_code == 200
    ), f"Expected 200 OK, got {response.status_code}: {response.text}"
    response_data = response.json()
    assert "response" in response_data
    assert isinstance(response_data["response"], str)
