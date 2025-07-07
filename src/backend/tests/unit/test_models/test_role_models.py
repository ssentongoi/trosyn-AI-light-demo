"""Unit tests for Role and Permission models."""
import pytest
from sqlalchemy.exc import IntegrityError
from app.models.role import Role, Permission

async def test_create_role(db_session, test_role):
    """Test creating a role."""
    test_role_obj = await test_role
    assert test_role_obj.id is not None
    assert test_role_obj.name == "test_role"
    assert test_role_obj.description == "Test Role"
    assert len(test_role_obj.permissions) == 0

async def test_role_with_permission(db_session, test_role, test_permission):
    """Test adding a permission to a role."""
    test_role_obj = await test_role
    test_permission_obj = await test_permission
    test_role_obj.permissions.append(test_permission_obj)
    await db_session.commit()
    
    assert len(test_role_obj.permissions) == 1
    assert test_role_obj.permissions[0].name == "test:permission"

async def test_role_name_uniqueness(db_session, test_role):
    """Test that role names must be unique."""
    test_role_obj = await test_role
    duplicate_role = Role(name="test_role", description="Duplicate Role")
    db_session.add(duplicate_role)
    
    with pytest.raises(IntegrityError):
        await db_session.commit()
    
    await db_session.rollback()

async def test_permission_creation(db_session, test_permission):
    """Test creating a permission."""
    test_permission_obj = await test_permission
    assert test_permission_obj.id is not None
    assert test_permission_obj.name == "test:permission"
    assert test_permission_obj.resource == "test"
    assert test_permission_obj.action == "permission"

async def test_permission_uniqueness(db_session, test_permission):
    """Test that permission names must be unique."""
    test_permission_obj = await test_permission
    duplicate_perm = Permission(
        name="test:permission",
        description="Duplicate Permission",
        resource="test",
        action="permission"
    )
    db_session.add(duplicate_perm)
    
    with pytest.raises(IntegrityError):
        await db_session.commit()
    
    await db_session.rollback()

async def test_user_role_relationship(db_session, test_user, test_role):
    """Test user-role relationship."""
    test_user_obj = await test_user
    test_role_obj = await test_role
    test_user_obj.roles.append(test_role_obj)
    await db_session.commit()
    
    assert len(test_user_obj.roles) == 1
    assert test_user_obj.roles[0].name == "test_role"
    assert test_user_obj in test_role_obj.users
