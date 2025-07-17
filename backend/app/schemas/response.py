from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr

from .user import User


class Token(BaseModel):
    access_token: str
    token_type: str
    expires_at: datetime

    class Config:
        from_attributes = True


class TokenData(BaseModel):
    username: Optional[str] = None
    scopes: list[str] = []


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    is_active: bool = True
    is_superuser: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None
    is_active: bool = True
    is_superuser: bool = False


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

    class Config:
        from_attributes = True
