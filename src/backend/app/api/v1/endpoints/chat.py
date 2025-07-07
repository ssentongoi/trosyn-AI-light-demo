from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
import json
import uuid

from app.database import get_db
from app.core.security import get_current_active_user
from app.schemas.chat import (
    ChatMessageCreate,
    ChatMessageInDB,
    ChatConversationCreate,
    ChatConversationInDB,
    ChatConversationWithMessages,
    ChatRequest,
    ChatResponse
)
from app.services.chat import ChatService
from app.models.user import User

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/conversations", response_model=List[ChatConversationInDB])
async def get_conversations(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all conversations for the current user.
    """
    return await ChatService.get_conversations_for_user(db=db, user_id=current_user.id, skip=skip, limit=limit)


@router.get("/conversations/{conversation_id}", response_model=ChatConversationWithMessages)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a single conversation with all its messages.
    """
    conversation = await ChatService.get_conversation_with_messages(db=db, conversation_id=conversation_id, user_id=current_user.id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.post("/conversations", response_model=ChatConversationInDB, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conversation_data: ChatConversationCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new conversation.
    """
    return await ChatService.create_conversation(db=db, user_id=current_user.id, conversation_data=conversation_data)


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a conversation and all its messages.
    """
    await ChatService.delete_conversation(db=db, user_id=current_user.id, conversation_id=conversation_id)
    return {"status": "success", "message": "Conversation deleted successfully"}


@router.post("/messages", response_model=Dict[str, Any])
async def create_message(
    message_data: ChatMessageCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Add a message to a conversation.
    """
    message = await ChatService.add_message_to_conversation(
        db=db, user_id=current_user.id, message_data=message_data
    )
    is_new_conversation = not message_data.conversation_id
    return {
        "message": message,
        "is_new_conversation": is_new_conversation
    }


@router.post("/chat", response_model=Dict[str, Any])
async def chat(
    chat_request: ChatRequest,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Main chat endpoint that handles both streaming and non-streaming responses.
    
    For streaming responses, returns an SSE stream with chunks of the AI's response.
    For non-streaming, returns the complete AI response in a single request.
    """
    try:
        # Process the chat request through the ChatService
        result = await ChatService.process_chat_request(
            db=db,
            user=current_user,
            chat_request=chat_request
        )
        
        # Handle streaming response
        if chat_request.stream and 'stream' in result:
            async def generate():
                try:
                    # Stream chunks from the AI service
                    async for chunk in result['stream']:
                        yield f"data: {json.dumps({'content': chunk})}\n\n"
                    # Send a final message to indicate completion
                    yield f"data: {json.dumps({'done': True})}\n\n"
                except Exception as e:
                    # Log the error and send an error message to the client
                    print(f"Error in stream generation: {str(e)}")
                    yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return StreamingResponse(
                generate(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no"
                }
            )
        
        # Non-streaming response
        return {
            "success": True,
            "conversation_id": result["conversation_id"],
            "is_new_conversation": result["is_new_conversation"],
            "message": result["message"]
        }
        
    except HTTPException as he:
        # Re-raise HTTP exceptions with their original status codes
        raise he
    except Exception as e:
        # Log the error and return a 500 response
        print(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing your request: {str(e)}"
        )
    
    # For non-streaming response
    return {
        "message": ai_message,
        "conversation_id": conversation_id,
        "is_new_conversation": is_new_conversation
    }
