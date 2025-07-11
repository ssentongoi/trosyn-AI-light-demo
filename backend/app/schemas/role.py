from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class PermissionBase(BaseModel):
    name: str
    description: Optional[str] = None
    resource: str
    action: str

class PermissionCreate(PermissionBase):
    pass

class PermissionInDB(PermissionBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class RoleBase(BaseModel):
    name: str = Field(..., max_length=50)
    description: Optional[str] = None

class RoleCreate(RoleBase):
    pass

class RoleUpdate(RoleBase):
    name: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None

class RoleInDB(RoleBase):
    id: int
    created_at: datetime
    updated_at: datetime
    permissions: List[PermissionInDB] = []

    class Config:
        orm_mode = True

class RoleWithUsers(RoleInDB):
    users: List[int] = []

class UserRoleAssignment(BaseModel):
    user_id: int
    role_id: int

class PermissionAssignment(BaseModel):
    role_id: int
    permission_id: int
