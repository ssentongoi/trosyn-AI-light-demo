from fastapi import Request, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from typing import Callable, Awaitable, Dict, Any, Optional, List, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import re

from app.database import get_db
from app.services.role import PermissionService
from app.models.user import User
from app.models.role import Role
from app.models.permission import Permission

class PermissionChecker:
    def __init__(self, required_permissions: List[Dict[str, str]] = None):
        """
        Initialize the permission checker with required permissions.
        
        Args:
            required_permissions: List of dicts containing 'resource' and 'action' keys
                Example: [{"resource": "users", "action": "read"}]
        """
        self.required_permissions = required_permissions or []

    async def __call__(self, request: Request, call_next):
        # Skip permission check for public endpoints
        if self._is_public_endpoint(request):
            return await call_next(request)
            
        # Get current user from request state (set by auth middleware)
        current_user = request.state.user if hasattr(request.state, 'user') else None
        
        # If no user is authenticated and endpoint requires auth
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        # Superusers bypass permission checks
        if getattr(current_user, 'is_superuser', False):
            return await call_next(request)
        
        # Get database session
        db = await self._get_db()
        
        try:
            # Check each required permission
            for perm in self.required_permissions:
                resource = perm.get('resource')
                action = perm.get('action')
                
                if not resource or not action:
                    continue
                    
                # Check if user has the required permission
                has_perm = await self._check_permission(db, current_user.id, resource, action)
                if not has_perm:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Insufficient permissions. Required: {action} on {resource}"
                    )
            
            # If we get here, all permissions are satisfied
            return await call_next(request)
            
        except HTTPException:
            raise
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(f"Permission check error: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while checking permissions"
            )
        finally:
            await db.close()
    
    async def _get_db(self) -> AsyncSession:
        """Get async database session"""
        async for session in get_db():
            return session
    
    def _is_public_endpoint(self, request: Request) -> bool:
        """Check if the requested endpoint is public"""
        # Add public endpoints that don't require authentication
        public_paths = [
            r'^/api/v1/auth/.*$',  # All auth endpoints
            r'^/docs$',
            r'^/redoc$',
            r'^/openapi\.json$',
        ]
        
        path = request.url.path
        return any(re.match(pattern, path) for pattern in public_paths)
    
    async def _check_permission(self, db: AsyncSession, user_id: int, resource: str, action: str) -> bool:
        """Check if user has the specified permission"""
        # First check if the user has the permission directly
        direct_permission = await self._check_direct_permission(db, user_id, resource, action)
        if direct_permission:
            return True
            
        # If no direct permission, check role-based permissions
        return await self._check_role_permissions(db, user_id, resource, action)
    
    async def _check_direct_permission(self, db: AsyncSession, user_id: int, resource: str, action: str) -> bool:
        """Check if user has the permission directly assigned"""
        from sqlalchemy import and_
        
        query = select(Permission).join(
            user_permission, 
            user_permission.c.permission_id == Permission.id
        ).filter(and_(
            user_permission.c.user_id == user_id,
            Permission.resource == resource,
            Permission.action == action
        ))
        
        result = await db.execute(query)
        return result.scalars().first() is not None
    
    async def _check_role_permissions(self, db: AsyncSession, user_id: int, resource: str, action: str) -> bool:
        """Check if any of the user's roles have the required permission"""
        from sqlalchemy import and_
        
        # Query to find if any of the user's roles have the required permission
        query = select(Permission).join(
            role_permission,
            role_permission.c.permission_id == Permission.id
        ).join(
            user_role,
            user_role.c.role_id == role_permission.c.role_id
        ).filter(and_(
            user_role.c.user_id == user_id,
            Permission.resource == resource,
            Permission.action == action
        ))
        
        result = await db.execute(query)
        return result.scalars().first() is not None

def has_permission(resource: str, action: str):
    """
    Decorator to check if user has specific permission.
    
    Usage:
        @router.get("/users/")
        @has_permission("users", "read")
        async def list_users():
            ...
    """
    def decorator(endpoint):
        async def wrapper(*args, **kwargs):
            # The first argument is either self (for class-based views) or request
            request = args[0] if len(args) > 0 else kwargs.get('request')
            
            if not request:
                raise ValueError("Request object not found in endpoint arguments")
                
            # Get current user from request state
            current_user = getattr(request.state, 'user', None)
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
                
            # Superusers bypass permission checks
            if getattr(current_user, 'is_superuser', False):
                return await endpoint(*args, **kwargs)
                
            # Get database session
            db = next(get_db())
            
            # Check permission
            has_perm = PermissionService.check_permission(
                db=db,
                user_id=current_user.id,
                resource=resource,
                action=action
            )
            
            if not has_perm:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions. Required: {action} on {resource}"
                )
                
            return await endpoint(*args, **kwargs)
            
        return wrapper
    return decorator
