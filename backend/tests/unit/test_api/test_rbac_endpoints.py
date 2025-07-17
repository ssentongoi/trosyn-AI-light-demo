"""Unit tests for RBAC API endpoints."""

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.models.role import Permission, Role
from app.schemas.role import PermissionCreate, RoleCreate


async def test_create_role(client, db_session, test_user):
    """Test creating a new role."""
    # Get test user token (simplified for example)
    # In a real test, you would authenticate and get a valid token
    test_user_obj = await test_user

    role_data = {"name": "editor", "description": "Content Editor Role"}

    response = await client.post(
        "/api/v1/roles/",
        json=role_data,
        # headers={"Authorization": f"Bearer {test_token}"}
    )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == "editor"
    assert data["description"] == "Content Editor Role"


async def test_get_roles(client, db_session, test_role):
    """Test retrieving all roles."""
    test_role_obj = await test_role
    response = await client.get("/api/v1/roles/")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert any(role["name"] == test_role_obj.name for role in data)


async def test_get_role(client, db_session, test_role):
    """Test retrieving a specific role by ID."""
    test_role_obj = await test_role
    response = await client.get(f"/api/v1/roles/{test_role_obj.id}")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == test_role_obj.id
    assert data["name"] == test_role_obj.name


async def test_add_permission_to_role(client, db_session, test_role):
    """Test adding a permission to a role."""
    test_role_obj = await test_role
    # Create a test permission
    permission = Permission(
        name="articles:edit",
        description="Edit articles",
        resource="articles",
        action="edit",
    )
    db_session.add(permission)
    await db_session.commit()

    response = await client.post(
        f"/api/v1/roles/{test_role_obj.id}/permissions/{permission.id}"
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert any(p["name"] == "articles:edit" for p in data["permissions"])


async def test_remove_permission_from_role(client, db_session, test_role):
    """Test removing a permission from a role."""
    test_role_obj = await test_role
    # Create and add a permission to the role
    permission = Permission(
        name="articles:delete",
        description="Delete articles",
        resource="articles",
        action="delete",
    )
    test_role_obj.permissions.append(permission)
    db_session.add(test_role_obj)
    await db_session.commit()

    response = await client.delete(
        f"/api/v1/roles/{test_role_obj.id}/permissions/{permission.id}"
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert not any(p["name"] == "articles:delete" for p in data["permissions"])


async def test_check_user_permission(client, db_session, test_user, test_role):
    """Test checking if a user has a specific permission."""
    test_user_obj = await test_user
    test_role_obj = await test_role
    # Create a permission and assign it to the role
    permission = Permission(
        name="settings:view",
        description="View settings",
        resource="settings",
        action="view",
    )
    test_role_obj.permissions.append(permission)
    test_user_obj.roles.append(test_role_obj)
    db_session.add(test_user_obj)
    await db_session.commit()

    response = await client.get(
        f"/api/v1/permissions/check?user_id={test_user_obj.id}&resource=settings&action=view"
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["has_permission"] is True

    # Test with a permission the user doesn't have
    response = client.get(
        f"/api/v1/roles/users/{test_user.id}/permissions/check",
        params={"resource": "settings", "action": "edit"},
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["has_permission"] is False
