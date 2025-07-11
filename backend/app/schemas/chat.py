from datetime import datetime
from typing import List, Optional, Union
from pydantic import BaseModel, Field, validator
from app.models.chat import MessageRole


class ChatMessageBase(BaseModel):
    """Base schema for chat messages."""
    role: MessageRole
    content: str = Field(..., min_length=1, max_length=10000)
    conversation_id: Optional[str] = None

    class Config:
        orm_mode = True
        use_enum_values = True


class ChatMessageCreate(ChatMessageBase):
    """Schema for creating a new chat message."""
    pass


class ChatMessageUpdate(BaseModel):
    """Schema for updating an existing chat message."""
    content: str = Field(..., min_length=1, max_length=10000)


class ChatMessageInDB(ChatMessageBase):
    """Schema for chat message in database."""
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class ChatConversationBase(BaseModel):
    """Base schema for chat conversations."""
    title: Optional[str] = Field(None, max_length=255)

    class Config:
        orm_mode = True


class ChatConversationCreate(ChatConversationBase):
    """Schema for creating a new chat conversation."""
    pass


class ChatConversationUpdate(ChatConversationBase):
    """Schema for updating a chat conversation."""
    title: str = Field(..., max_length=255)


class ChatConversationInDB(ChatConversationBase):
    """Schema for chat conversation in database."""
    id: str
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class ChatConversationWithMessages(ChatConversationInDB):
    """Schema for chat conversation with its messages."""
    messages: List[ChatMessageInDB] = []


class ChatResponse(BaseModel):
    """Schema for chat API responses."""
    success: bool
    message: str
    data: Optional[Union[ChatMessageInDB, ChatConversationInDB, dict]] = None


class ChatRequest(BaseModel):
    """Schema for chat API requests."""
    message: str = Field(..., min_length=1, max_length=10000)
    conversation_id: Optional[str] = None
    stream: bool = False

    @validator('message')
    def message_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Message cannot be empty')
        return v.strip()
