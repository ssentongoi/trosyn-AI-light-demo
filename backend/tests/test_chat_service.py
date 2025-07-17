import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models.chat import ChatConversation, ChatMessage, MessageRole
from app.models.user import User
from app.services.chat import ChatService

# Use an in-memory SQLite database for testing
DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture
async def db_session() -> AsyncSession:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_get_conversation_with_messages(db_session: AsyncSession):
    # Arrange: Create a test user
    test_user = User(
        email="test@example.com",
        username="testuser",
        hashed_password="password",
        is_active=True,
        is_superuser=False,
    )
    db_session.add(test_user)
    await db_session.commit()
    await db_session.refresh(test_user)

    # Arrange: Create a conversation and messages
    conversation = ChatConversation(user_id=test_user.id, title="Test Conversation")
    db_session.add(conversation)
    await db_session.flush()  # Flush to get the conversation ID

    message1 = ChatMessage(
        conversation_id=conversation.id,
        user_id=test_user.id,
        role=MessageRole.USER,
        content="Hello",
    )
    message2 = ChatMessage(
        conversation_id=conversation.id,
        user_id=test_user.id,
        role=MessageRole.ASSISTANT,
        content="Hi there!",
    )
    db_session.add_all([message1, message2])
    await db_session.commit()

    # Act: Call the service function
    result = await ChatService.get_conversation_with_messages(
        db=db_session, user_id=test_user.id, conversation_id=conversation.id
    )

    # Assert
    assert result is not None
    assert result.id == conversation.id
    assert len(result.messages) == 2
    assert result.messages[0].content == "Hello"
    assert result.messages[1].role == MessageRole.ASSISTANT
