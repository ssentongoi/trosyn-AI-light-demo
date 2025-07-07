from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ....database import get_db
from ....services.role import RoleService, PermissionService
from ....schemas.role import (
    RoleCreate, RoleUpdate, RoleInDB, PermissionCreate, PermissionInDB,
    UserRoleAssignment, PermissionAssignment, RoleWithUsers
)
from ....models.role import Role
from ....models.permission import Permission
from ....models.user import User
from ....core.security import get_current_active_user

router = APIRouter()

# Role endpoints
@router.post("/", response_model=RoleInDB, status_code=status.HTTP_201_CREATED)
async def create_role(
    role: RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new role"""
    db_role = await RoleService.get_role_by_name(db, name=role.name)
    if db_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role with this name already exists"
        )
    return await RoleService.create_role(db=db, role=role)

@router.get("/", response_model=List[RoleInDB])
async def read_roles(
    skip: int = 0, 
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieve all roles"""
    return await RoleService.get_roles(db, skip=skip, limit=limit)

@router.get("/{role_id}", response_model=RoleInDB)
async def read_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific role by ID"""
    db_role = await RoleService.get_role(db, role_id=role_id)
    if db_role is None:
        raise HTTPException(status_code=404, detail="Role not found")
    return db_role

@router.put("/{role_id}", response_model=RoleInDB)
async def update_role(
    role_id: int,
    role: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a role"""
    db_role = await RoleService.get_role(db, role_id=role_id)
    if db_role is None:
        raise HTTPException(status_code=404, detail="Role not found")
    return await RoleService.update_role(db=db, role_id=role_id, role=role)

@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a role"""
    db_role = await RoleService.get_role(db, role_id=role_id)
    if db_role is None:
        raise HTTPException(status_code=404, detail="Role not found")
    await RoleService.delete_role(db=db, role_id=role_id)
    return None

# Role-User assignment endpoints
@router.post("/assign-role", status_code=status.HTTP_200_OK)
async def assign_role_to_user(
    assignment: UserRoleAssignment,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Assign a role to a user"""
    return await RoleService.assign_role_to_user(
        db=db, 
        user_id=assignment.user_id, 
        role_id=assignment.role_id
    )

@router.post("/remove-role", status_code=status.HTTP_200_OK)
async def remove_role_from_user(
    assignment: UserRoleAssignment,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Remove a role from a user"""
    return await RoleService.remove_role_from_user(
        db=db, 
        user_id=assignment.user_id, 
        role_id=assignment.role_id
    )

# Permission endpoints
@router.post("/permissions/", response_model=PermissionInDB, status_code=status.HTTP_201_CREATED)
async def create_permission(
    permission: PermissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new permission"""
    db_permission = await PermissionService.get_permission_by_name(db, name=permission.name)
    if db_permission:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Permission with this name already exists"
        )
    return await PermissionService.create_permission(db=db, permission=permission)

@router.post("/permissions/assign", status_code=status.HTTP_200_OK)
async def assign_permission_to_role(
    assignment: PermissionAssignment,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Assign a permission to a role"""
    return await PermissionService.assign_permission_to_role(
        db=db, 
        role_id=assignment.role_id, 
        permission_id=assignment.permission_id
    )

@router.post("/permissions/revoke", status_code=status.HTTP_200_OK)
async def remove_permission_from_role(
    assignment: PermissionAssignment,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Revoke a permission from a role"""
    return await PermissionService.remove_permission_from_role(
        db=db, 
        role_id=assignment.role_id, 
        permission_id=assignment.permission_id
    )
