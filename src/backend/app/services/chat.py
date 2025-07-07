import uuid
from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any, AsyncGenerator
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException, status

from app.models.chat import ChatMessage, ChatConversation, MessageRole
from app.schemas.chat import (
    ChatMessageCreate,
    ChatMessageInDB,
    ChatConversationCreate,
    ChatConversationInDB,
    ChatConversationWithMessages,
    ChatRequest,
    ChatResponse
)
from app.models.user import User
from app.services.ai_service import ai_service


class ChatService:
    """Service class for handling chat-related operations."""

    @staticmethod
    def _generate_conversation_id() -> str:
        """Generate a unique conversation ID."""
        return f"conv_{uuid.uuid4().hex}"

    @staticmethod
    def _verify_user_access(db: Session, user_id: int, conversation_id: str) -> ChatConversation:
        """Verify if the user has access to the conversation."""
        conversation = db.query(ChatConversation).filter(
            ChatConversation.id == conversation_id,
            ChatConversation.user_id == user_id
        ).first()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied"
            )
        return conversation

    @classmethod
    def create_conversation(
        cls, 
        db: Session, 
        user: User, 
        conversation_data: ChatConversationCreate
    ) -> ChatConversationInDB:
        """Create a new conversation."""
        try:
            conversation = ChatConversation(
                id=cls._generate_conversation_id(),
                user_id=user.id,
                title=conversation_data.title or f"Conversation {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
            return ChatConversationInDB.from_orm(conversation)
        except SQLAlchemyError as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create conversation: {str(e)}"
            )

    @classmethod
    def get_user_conversations(
        cls,
        db: Session,
        user: User,
        skip: int = 0,
        limit: int = 100
    ) -> List[ChatConversationInDB]:
        """Get all conversations for a user."""
        try:
            conversations = db.query(ChatConversation)\
                .filter(ChatConversation.user_id == user.id)\
                .order_by(ChatConversation.updated_at.desc())\
                .offset(skip)\
                .limit(limit)\
                .all()
            return [ChatConversationInDB.from_orm(conv) for conv in conversations]
        except SQLAlchemyError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch conversations: {str(e)}"
            )

    @classmethod
    def get_conversation(
        cls,
        db: Session,
        user: User,
        conversation_id: str,
        include_messages: bool = True
    ) -> ChatConversationWithMessages:
        """Get a single conversation with its messages."""
        try:
            query = db.query(ChatConversation)\
                .filter(
                    ChatConversation.id == conversation_id,
                    ChatConversation.user_id == user.id
                )
            
            if include_messages:
                query = query.options(
                    sqlalchemy.orm.joinedload(ChatConversation.messages)
                    .order_by(ChatMessage.created_at.asc())
                )
            
            conversation = query.first()
            
            if not conversation:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found or access denied"
                )
            
            return ChatConversationWithMessages.from_orm(conversation)
        except SQLAlchemyError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch conversation: {str(e)}"
            )

    @classmethod
    def add_message(
        cls,
        db: Session,
        user: User,
        message_data: ChatMessageCreate,
        conversation_id: Optional[str] = None
    ) -> Tuple[ChatMessageInDB, bool]:
        """Add a message to a conversation. Creates a new conversation if conversation_id is None."""
        try:
            # If no conversation_id is provided, create a new conversation
            if not conversation_id:
                conversation = ChatConversation(
                    id=cls._generate_conversation_id(),
                    user_id=user.id,
                    title=message_data.content[:50] + ("..." if len(message_data.content) > 50 else ""),
                )
                db.add(conversation)
                db.flush()  # Get the conversation ID without committing
                conversation_id = conversation.id
                is_new_conversation = True
            else:
                # Verify the conversation exists and the user has access
                conversation = cls._verify_user_access(db, user.id, conversation_id)
                is_new_conversation = False
            
            # Create the message
            message = ChatMessage(
                user_id=user.id,
                conversation_id=conversation_id,
                role=message_data.role,
                content=message_data.content
            )
            db.add(message)
            
            # Update the conversation's updated_at timestamp
            conversation.updated_at = datetime.utcnow()
            
            db.commit()
            db.refresh(message)
            
            return ChatMessageInDB.from_orm(message), is_new_conversation
            
        except SQLAlchemyError as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to add message: {str(e)}"
            )

    @classmethod
    def delete_conversation(
        cls,
        db: Session,
        user: User,
        conversation_id: str
    ) -> bool:
        """Delete a conversation and all its messages."""
        try:
            # This will cascade delete all messages due to the relationship
            result = db.query(ChatConversation)\
                .filter(
                    ChatConversation.id == conversation_id,
                    ChatConversation.user_id == user.id
                )\
                .delete()
            
            if result == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found or access denied"
                )
            
            db.commit()
            return True
            
        except SQLAlchemyError as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete conversation: {str(e)}"
            )

    @classmethod
    async def process_chat_request(
        cls,
        db: Session,
        user: User,
        chat_request: ChatRequest,
    ) -> Dict[str, Any]:
        """
        Process a chat request, including AI response generation.
        
        Args:
            db: Database session.
            user: The user making the request.
            chat_request: The chat request data.
            
        Returns:
            A dictionary containing the response data.
        """
        # Add the user's message to the conversation
        message_data = ChatMessageCreate(
            role=MessageRole.USER,
            content=chat_request.message,
            conversation_id=chat_request.conversation_id
        )
        
        message, is_new_conversation = await cls.add_message(
            db=db,
            user=user,
            message_data=message_data,
            conversation_id=chat_request.conversation_id
        )
        
        # Get the conversation history for context
        conversation = await cls.get_conversation(
            db=db,
            user=user,
            conversation_id=message.conversation_id,
            include_messages=True
        )
        
        # Prepare the conversation history for the AI
        messages = [
            {
                "role": msg.role.value,
                "content": msg.content
            }
            for msg in conversation.messages
        ]
        
        # Generate the AI's response
        try:
            ai_response = await ai_service.process_chat(
                user_message=chat_request.message,
                conversation_history=messages,
                stream=chat_request.stream
            )
            
            # If streaming, return the generator
            if chat_request.stream:
                return {
                    "conversation_id": message.conversation_id,
                    "is_new_conversation": is_new_conversation,
                    "stream": ai_response
                }
            
            # For non-streaming, store the AI's response
            ai_message = await cls.add_message(
                db=db,
                user=user,
                message_data=ChatMessageCreate(
                    role=MessageRole.ASSISTANT,
                    content=ai_response,
                    conversation_id=message.conversation_id
                ),
                conversation_id=message.conversation_id
            )
            
            return {
                "conversation_id": message.conversation_id,
                "is_new_conversation": is_new_conversation,
                "message": ai_message[0] if isinstance(ai_message, tuple) else ai_message
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate AI response: {str(e)}"
            )
