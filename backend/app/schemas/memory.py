from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, validator


class MemoryAccessLevel(str, Enum):
    PRIVATE = "private"
    SHARED = "shared"
    PUBLIC = "public"


class MemoryInteractionBase(BaseModel):
    """Base schema for memory interactions"""

    query: str
    response: Optional[str] = None
    conversation_id: Optional[str] = None
    source: str = "chat"
    metadata: Dict[str, Any] = {}
    is_private: bool = False
    retention_days: Optional[int] = None


class MemoryInteractionCreate(MemoryInteractionBase):
    """Schema for creating a new memory interaction"""

    pass


class MemoryInteractionUpdate(BaseModel):
    """Schema for updating an existing memory interaction"""

    is_private: Optional[bool] = None
    retention_days: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


class MemoryInteractionInDB(MemoryInteractionBase):
    """Schema for memory interaction in database"""

    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class MemoryContextBase(BaseModel):
    """Base schema for memory contexts"""

    name: str
    description: Optional[str] = None
    context_data: Dict[str, Any] = {}
    is_private: bool = True
    access_level: MemoryAccessLevel = MemoryAccessLevel.PRIVATE


class MemoryContextCreate(MemoryContextBase):
    """Schema for creating a new memory context"""

    pass


class MemoryContextUpdate(BaseModel):
    """Schema for updating an existing memory context"""

    name: Optional[str] = None
    description: Optional[str] = None
    context_data: Optional[Dict[str, Any]] = None
    is_private: Optional[bool] = None
    access_level: Optional[MemoryAccessLevel] = None


class MemoryContextInDB(MemoryContextBase):
    """Schema for memory context in database"""

    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class MemorySessionBase(BaseModel):
    """Base schema for memory sessions"""

    name: Optional[str] = None
    description: Optional[str] = None
    tags: List[str] = []
    is_active: bool = True
    metadata: Dict[str, Any] = {}
    ended_at: Optional[datetime] = None


class MemorySessionCreate(MemorySessionBase):
    """Schema for creating a new memory session"""

    pass


class MemorySessionUpdate(BaseModel):
    """Schema for updating an existing memory session"""

    name: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None
    ended_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None


class MemorySessionInDB(MemorySessionBase):
    """Schema for memory session in database"""

    id: str
    user_id: str
    started_at: datetime
    last_activity: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class MemoryStats(BaseModel):
    """Schema for memory statistics"""

    total_interactions: int = 0
    total_sessions: int = 0
    total_contexts: int = 0
    interactions_by_day: Dict[str, int] = {}
    interactions_by_type: Dict[str, int] = {}
    storage_usage: Dict[str, Any] = {}
    last_updated: datetime
