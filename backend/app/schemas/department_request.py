from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from pydantic import field_validator
from enum import Enum

# Enums for request status, priority, and type
class RequestStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class RequestPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class RequestType(str, Enum):
    EQUIPMENT = "equipment"
    PERSONNEL = "personnel"
    TRAINING = "training"
    MAINTENANCE = "maintenance"
    OTHER = "other"

# Base schemas
class RequestAttachmentBase(BaseModel):
    filename: str
    file_path: str
    file_size: int
    mime_type: str

class RequestCommentBase(BaseModel):
    content: str
    is_internal: bool = False

class RequestHistoryBase(BaseModel):
    action: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None

# Create schemas
class RequestAttachmentCreate(RequestAttachmentBase):
    pass

class RequestCommentCreate(RequestCommentBase):
    pass

class DepartmentRequestCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=255)
    description: Optional[str] = None
    department_id: int
    request_type: RequestType
    priority: RequestPriority = RequestPriority.MEDIUM
    due_date: Optional[datetime] = None
    estimated_cost: Optional[int] = Field(None, ge=0, description="Estimated cost in cents")
    custom_fields: Optional[Dict[str, Any]] = None
    
    @field_validator('due_date')
    def validate_due_date(cls, v):
        if v and v.tzinfo:
            v = v.replace(tzinfo=None)
        if v and v < datetime.utcnow():
            raise ValueError("Due date must be in the future")
        return v

# Update schemas
class RequestAttachmentUpdate(BaseModel):
    filename: Optional[str] = None
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None

class RequestCommentUpdate(BaseModel):
    content: Optional[str] = None
    is_internal: Optional[bool] = None

class DepartmentRequestUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=255)
    description: Optional[str] = None
    status: Optional[RequestStatus] = None
    priority: Optional[RequestPriority] = None
    request_type: Optional[RequestType] = None
    due_date: Optional[datetime] = None
    estimated_cost: Optional[int] = Field(None, ge=0, description="Estimated cost in cents")
    approver_id: Optional[int] = None
    custom_fields: Optional[Dict[str, Any]] = None
    
    @field_validator('due_date')
    def validate_due_date(cls, v):
        if v and v.tzinfo:
            v = v.replace(tzinfo=None)
        if v and v < datetime.utcnow():
            raise ValueError("Due date must be in the future")
        return v

# In DB schemas (with IDs and timestamps)
class RequestAttachmentInDBBase(RequestAttachmentBase):
    id: int
    request_id: int
    uploaded_by: int
    created_at: datetime

    class Config:
        orm_mode = True

class RequestCommentInDBBase(RequestCommentBase):
    id: int
    request_id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class RequestHistoryInDBBase(RequestHistoryBase):
    id: int
    request_id: int
    user_id: int
    created_at: datetime

    class Config:
        orm_mode = True

class DepartmentRequestInDBBase(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: RequestStatus
    priority: RequestPriority
    request_type: RequestType
    due_date: Optional[datetime]
    estimated_cost: Optional[int]
    requester_id: int
    department_id: int
    approver_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    approved_at: Optional[datetime]
    completed_at: Optional[datetime]
    custom_fields: Optional[Dict[str, Any]]

    class Config:
        orm_mode = True

# Full schemas with relationships
class UserBase(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None

    class Config:
        orm_mode = True

class DepartmentBase(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True

class RequestAttachment(RequestAttachmentInDBBase):
    user: UserBase

class RequestComment(RequestCommentInDBBase):
    user: UserBase

class RequestHistory(RequestHistoryInDBBase):
    user: UserBase

class DepartmentRequest(DepartmentRequestInDBBase):
    requester: UserBase
    department: DepartmentBase
    approver: Optional[UserBase] = None
    comments: List[RequestComment] = []
    attachments: List[RequestAttachment] = []
    history: List[RequestHistory] = []

# Response schemas
class DepartmentRequestResponse(BaseModel):
    success: bool = True
    data: DepartmentRequest

class DepartmentRequestListResponse(BaseModel):
    success: bool = True
    data: List[DepartmentRequest]
    total: int
    page: int
    limit: int
    total_pages: int
