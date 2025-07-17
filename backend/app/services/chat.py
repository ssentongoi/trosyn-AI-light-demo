import logging
import uuid
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import load_only, selectinload

from app.models.chat import ChatConversation, ChatMessage, MessageRole
from app.models.user import User
from app.schemas.chat import (
    ChatConversationCreate,
    ChatConversationInDB,
    ChatConversationWithMessages,
    ChatMessageCreate,
    ChatMessageInDB,
    ChatRequest,
)
from app.services.ai_service import ai_service

logger = logging.getLogger(__name__)


class ChatService:
    """Service class for handling chat-related operations."""

    @classmethod
    async def get_conversations_for_user(
        cls, db: AsyncSession, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[ChatConversationInDB]:
        """Get all conversations for a user."""
        stmt = (
            select(ChatConversation)
            .where(ChatConversation.user_id == user_id)
            .order_by(ChatConversation.updated_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        conversations = result.scalars().all()
        return [ChatConversationInDB.model_validate(c) for c in conversations]

    @classmethod
    async def get_conversation_with_messages(
        cls, db: AsyncSession, conversation_id: str, user_id: str
    ) -> ChatConversationWithMessages:
        """
        Gets a conversation and all its messages, ensuring all data is eagerly loaded
        to prevent async context errors during serialization.
        """
        stmt = (
            select(ChatConversation)
            .where(
                ChatConversation.id == conversation_id,
                ChatConversation.user_id == user_id,
            )
            .options(
                # Use selectinload for the one-to-many relationship
                selectinload(ChatConversation.messages).options(
                    # Within the related messages, explicitly load every column.
                    # This is the crucial step to prevent deferred loading and the
                    # subsequent MissingGreenlet error.
                    load_only(
                        ChatMessage.id,
                        ChatMessage.user_id,
                        ChatMessage.conversation_id,
                        ChatMessage.role,
                        ChatMessage.content,
                        ChatMessage.created_at,
                        ChatMessage.updated_at,
                    )
                )
            )
        )

        result = await db.execute(stmt)
        conversation = result.scalar_one_or_none()

        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Even with eager loading, we construct a dictionary to be 100% safe
        # and ensure the data is detached from the session before Pydantic validation.
        conversation_dict = {
            "id": conversation.id,
            "user_id": conversation.user_id,
            "title": conversation.title,
            "created_at": conversation.created_at,
            "updated_at": conversation.updated_at,
            "messages": [
                {
                    "id": msg.id,
                    "user_id": msg.user_id,
                    "conversation_id": msg.conversation_id,
                    "role": msg.role,
                    "content": msg.content,
                    "created_at": msg.created_at,
                    "updated_at": msg.updated_at,
                }
                for msg in conversation.messages
            ],
        }

        return ChatConversationWithMessages.model_validate(conversation_dict)

    @classmethod
    async def create_conversation(
        cls, db: AsyncSession, user_id: int, conversation_data: ChatConversationCreate
    ) -> ChatConversationInDB:
        """Create a new conversation."""
        conversation = ChatConversation(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=conversation_data.title
            or f"Conversation {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
        )
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
        return ChatConversationInDB.model_validate(conversation)

    @classmethod
    async def delete_conversation(
        cls, db: AsyncSession, user_id: int, conversation_id: str
    ):
        """Delete a conversation and all its messages."""
        stmt = delete(ChatConversation).where(
            ChatConversation.id == conversation_id, ChatConversation.user_id == user_id
        )
        result = await db.execute(stmt)
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Conversation not found")
        await db.commit()

    @classmethod
    async def add_message(
        cls, db: AsyncSession, user_id: int, message_data: ChatMessageCreate
    ) -> Tuple[ChatMessageInDB, bool]:
        """Adds a message to a conversation. If conversation_id is not provided, a new conversation is created."""
        conversation_id = message_data.conversation_id
        is_new_conversation = False

        if not conversation_id:
            conversation = ChatConversation(
                id=str(uuid.uuid4()),
                user_id=user_id,
                title=message_data.content[:50],
            )
            db.add(conversation)
            await db.flush()
            conversation_id = conversation.id
            is_new_conversation = True
        else:
            conversation = await db.get(ChatConversation, conversation_id)
            if not conversation or conversation.user_id != user_id:
                raise HTTPException(status_code=404, detail="Conversation not found")

        message = ChatMessage(
            role=message_data.role,
            content=message_data.content,
            user_id=user_id,
            conversation_id=conversation_id,
        )
        db.add(message)
        conversation.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(message)
        return ChatMessageInDB.model_validate(message), is_new_conversation

    @classmethod
    async def process_chat_request(
        cls, db: AsyncSession, user: User, chat_request: ChatRequest
    ) -> Dict[str, Any]:
        """Process a chat request, including AI response generation."""
        try:
            message_data = ChatMessageCreate(
                role=MessageRole.USER,
                content=chat_request.message,
                conversation_id=chat_request.conversation_id,
            )
            user_message, is_new_conversation = await cls.add_message(
                db=db, user_id=user.id, message_data=message_data
            )

            conversation = await cls.get_conversation_with_messages(
                db=db, user_id=user.id, conversation_id=user_message.conversation_id
            )

            history = [
                {"role": msg.role, "content": msg.content}
                for msg in conversation.messages
            ]

            ai_response_content = await ai_service.process_chat(
                user_message=chat_request.message,
                conversation_history=history,
                stream=chat_request.stream,
            )

            if chat_request.stream:

                async def stream_generator():
                    yield f'data: {{"conversation_id": "{user_message.conversation_id}", "is_new_conversation": {str(is_new_conversation).lower()}}}\n\n'
                    full_response = ""
                    async for chunk in ai_response_content:
                        full_response += chunk
                        yield f'data: {{"response": "{chunk}"}}\n\n'

                    ai_message_data = ChatMessageCreate(
                        role=MessageRole.ASSISTANT,
                        content=full_response,
                        conversation_id=user_message.conversation_id,
                    )
                    await cls.add_message(
                        db=db, user_id=user.id, message_data=ai_message_data
                    )

                return {"stream": stream_generator()}

            ai_message_data = ChatMessageCreate(
                role=MessageRole.ASSISTANT,
                content=ai_response_content,
                conversation_id=user_message.conversation_id,
            )
            ai_message, _ = await cls.add_message(
                db=db, user_id=user.id, message_data=ai_message_data
            )

            return {
                "conversation_id": user_message.conversation_id,
                "is_new_conversation": is_new_conversation,
                "response": ai_message.content,
            }
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Database error during chat processing: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="A database error occurred.")
        except Exception as e:
            logger.error(f"Error processing chat request: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="An unexpected error occurred.")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate AI response: {str(e)}",
            )
