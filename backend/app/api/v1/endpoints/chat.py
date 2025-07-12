import json
from typing import List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.chat import (
    ChatConversationCreate,
    ChatConversationInDB,
    ChatConversationWithMessages,
    ChatRequest,
)
from app.services.chat import ChatService

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/conversations/", response_model=ChatConversationInDB, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conversation_data: ChatConversationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChatConversationInDB:
    """Create a new chat conversation."""
    return await ChatService.create_conversation(
        db=db, user_id=current_user.id, conversation_data=conversation_data
    )


@router.get("/conversations/", response_model=List[ChatConversationInDB])
async def get_conversations(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[ChatConversationInDB]:
    """Retrieve all conversations for the current user."""
    return await ChatService.get_conversations_for_user(
        db=db, user_id=current_user.id, skip=skip, limit=limit
    )


@router.get("/conversations/{conversation_id}", response_model=ChatConversationWithMessages)
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChatConversationWithMessages:
    """Retrieve a single conversation by ID."""
    conversation = await ChatService.get_conversation_with_messages(
        db=db, user_id=current_user.id, conversation_id=conversation_id
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a conversation by ID."""
    await ChatService.delete_conversation(
        db=db, user_id=current_user.id, conversation_id=conversation_id
    )
    return


@router.post("/chat")
async def chat(
    chat_request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Process a chat request and get a response from the AI."""
    response = await ChatService.process_chat_request(
        db=db, user=current_user, chat_request=chat_request
    )

    if chat_request.stream and "stream" in response:
        return StreamingResponse(response["stream"], media_type="text/event-stream")

    return response
