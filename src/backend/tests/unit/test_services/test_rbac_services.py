"""Unit tests for RBAC services."""
import pytest
from sqlalchemy.orm import Session

from app.services.role import RoleService, PermissionService
from app.models.role import Role, Permission
from app.schemas.role import RoleCreate, PermissionCreate

async def test_create_role(db_session):
    """Test creating a role using RoleService."""
    role_data = RoleCreate(
        name="admin",
        description="Administrator role"
    )
    
    role = await RoleService.create_role(db_session, role_data)
    
    assert role.id is not None
    assert role.name == "admin"
    assert role.description == "Administrator role"

async def test_get_role(db_session, test_role):
    """Test retrieving a role by ID."""
    test_role_obj = await test_role
    role = await RoleService.get_role(db_session, test_role_obj.id)
    assert role is not None
    assert role.name == test_role_obj.name

async def test_get_role_by_name(db_session, test_role):
    """Test retrieving a role by name."""
    test_role_obj = await test_role
    role = await RoleService.get_role_by_name(db_session, test_role_obj.name)
    assert role is not None
    assert role.id == test_role_obj.id

async def test_add_permission_to_role(db_session, test_role):
    """Test adding a permission to a role."""
    test_role_obj = await test_role
    permission = Permission(
        name="users:read",
        description="Read users",
        resource="users",
        action="read"
    )
    db_session.add(permission)
    await db_session.commit()
    
    updated_role = await RoleService.add_permission_to_role(
        db_session, 
        role_id=test_role_obj.id,
        permission_id=permission.id
    )
    
    assert len(updated_role.permissions) == 1
    assert updated_role.permissions[0].name == "users:read"

async def test_remove_permission_from_role(db_session, test_role):
    """Test removing a permission from a role."""
    test_role_obj = await test_role
    permission = Permission(
        name="users:write",
        description="Write users",
        resource="users",
        action="write"
    )
    test_role_obj.permissions.append(permission)
    db_session.add(test_role_obj)
    await db_session.commit()
    
    updated_role = await RoleService.remove_permission_from_role(
        db_session,
        role_id=test_role_obj.id,
        permission_id=permission.id
    )
    
    assert len(updated_role.permissions) == 0

async def test_check_permission(db_session, test_user, test_role):
    """Test checking if a user has a specific permission."""
    # Await the async fixtures
    test_user_obj = await test_user
    test_role_obj = await test_role
    
    # Create a permission
    permission = Permission(
        name="documents:read",
        description="Read documents",
        resource="documents",
        action="read"
    )
    db_session.add(permission)
    
    # Add permission to role and role to user
    test_role_obj.permissions.append(permission)
    test_user_obj.roles.append(test_role_obj)
    await db_session.commit()
    
    # Check permission
    has_permission = await PermissionService.check_permission(
        db_session,
        user_id=test_user_obj.id,
        resource="documents",
        action="read"
    )
    
    assert has_permission is True
    
    # Check non-existent permission
    has_permission = PermissionService.check_permission(
        db_session,
        user_id=test_user.id,
        resource="documents",
        action="write"
    )
    
    assert has_permission is False
