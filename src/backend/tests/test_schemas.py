"""
Test schemas for Department Request API tests.

These simplified schemas are designed to avoid serialization issues with relationships
and ensure proper validation during testing.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class RequestType(str, Enum):
    PURCHASE = "purchase"
    MAINTENANCE = "maintenance"
    PERSONNEL = "personnel"
    EQUIPMENT = "equipment"

class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class Status(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

# Simplified schemas for testing

class TestUserSchema(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None

    class Config:
        from_attributes = True

class TestDepartmentSchema(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class TestDepartmentRequestCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    request_type: RequestType
    priority: Priority
    department_id: int

class TestDepartmentRequestResponse(BaseModel):
    id: int
    title: str
    description: str
    request_type: RequestType
    priority: Priority
    status: Status = Status.DRAFT
    department_id: int
    requester_id: int
    created_at: datetime
    updated_at: datetime
    
    # Optional relationships for testing
    requester: Optional[TestUserSchema] = None
    department: Optional[TestDepartmentSchema] = None
    approver: Optional[TestUserSchema] = None

    class Config:
        from_attributes = True
        # Allow datetime serialization
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class TestDepartmentRequestResponseWrapper(BaseModel):
    """Wrapper for API response with success flag and data"""
    success: bool = True
    data: TestDepartmentRequestResponse
