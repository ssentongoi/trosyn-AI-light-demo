# Role-Based Access Control (RBAC) Implementation

This document outlines the RBAC implementation in the Trosyn AI backend, including how to use the permission system in your API endpoints.

## Core Concepts

### Permissions
- Represent actions that can be performed on resources
- Format: `{resource}:{action}` (e.g., `user:read`, `document:write`)
- Stored in the `permissions` table

### Roles
- Collections of permissions
- Can be assigned to users
- Predefined roles: `admin`, `manager`, `user`
- Stored in the `roles` table with a many-to-many relationship to permissions

### Users
- Can be assigned one or more roles
- Have a `is_superuser` flag that bypasses all permission checks
- Permissions are the union of all permissions from all assigned roles

## Using the Permission System

### Protecting Endpoints

#### Option 1: Using PermissionChecker (recommended for route dependencies)

```python
from fastapi import APIRouter, Depends
from app.middleware.permission_middleware import PermissionChecker

router = APIRouter()

# Require single permission
@router.get("/users/")
async def list_users():
    return [{"id": 1, "name": "John Doe"}]

# Require multiple permissions (all must be satisfied)
@router.post("/users/", dependencies=[
    Depends(PermissionChecker([
        {"resource": "user", "action": "write"},
        {"resource": "department", "action": "assign"}
    ]))
])
async def create_user():
    return {"status": "user created"}
```

#### Option 2: Using the @has_permission decorator

```python
from fastapi import APIRouter
from app.middleware.permission_middleware import has_permission

router = APIRouter()

@router.get("/users/{user_id}")
@has_permission("user", "read")
async def get_user(user_id: int):
    return {"id": user_id, "name": "John Doe"}
```

### Checking Permissions in Route Handlers

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.permission import PermissionService

router = APIRouter()

@router.get("/documents/{document_id}")
async def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Check if user has permission to view this specific document
    has_access = await PermissionService.check_document_permission(
        db=db,
        user_id=current_user.id,
        document_id=document_id,
        action="read"
    )
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this document"
        )
    
    return {"id": document_id, "content": "Document content"}
```

## Default Roles and Permissions

### Admin
- Full access to all resources
- Can manage users, roles, and permissions
- Permissions:
  - `user:read`, `user:write`, `user:delete`
  - `role:read`, `role:write`, `role:delete`
  - `document:read`, `document:write`, `document:delete`
  - `settings:read`, `settings:write`

### Manager
- Limited administrative access
- Can view users and roles but not modify them
- Permissions:
  - `user:read`
  - `role:read`
  - `document:read`, `document:write`

### User
- Basic access
- Can only view their own data
- Permissions:
  - `user:read` (own profile only)
  - `document:read` (assigned documents only)

## Adding New Permissions

1. Add the new permission to the `default_permissions` list in `app/main.py`
2. Update the relevant role(s) to include the new permission
3. The permission will be automatically created on application startup

## Best Practices

1. **Be Specific**: Create granular permissions for different actions
2. **Use Resource-Based Permissions**: Follow the `resource:action` pattern
3. **Check Permissions Early**: Fail fast if user doesn't have required permissions
4. **Log Permission Denials**: For security auditing
5. **Test Permissions**: Include permission checks in your test suite

## Testing

When writing tests, you can use the test client with different user roles:

```python
def test_admin_can_delete_user(test_client, admin_token):
    response = test_client.delete(
        "/api/v1/users/123",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200

def test_user_cannot_delete_user(test_client, user_token):
    response = test_client.delete(
        "/api/v1/users/123",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 403
```

## Troubleshooting

### Common Issues

1. **Permission Denied (403)**:
   - Check if the user has the required role/permission
   - Verify the permission string matches exactly
   - Check if the user is active

2. **Database Errors**:
   - Ensure all migrations have been applied
   - Check if the default roles and permissions were created on startup

3. **CORS Issues**:
   - Make sure the frontend is sending the correct Authorization header
   - Verify CORS settings in the FastAPI app

For additional help, check the application logs or contact the development team.
