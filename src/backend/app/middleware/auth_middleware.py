from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from typing import Optional, Dict, Any, Generator
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database import get_db
from app.models.user import User

class JWTBearer(HTTPBearer):
    """Middleware for JWT token authentication"""
    
    def __init__(self, auto_error: bool = True):
        super().__init__(auto_error=auto_error)
    
    async def __call__(self, request: Request) -> User:
        credentials: HTTPAuthorizationCredentials = await super().__call__(request)
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid authorization code."
            )
            
        if not credentials.scheme == "Bearer":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid authentication scheme."
            )
            
        token = credentials.credentials
        payload = self.verify_jwt(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid token or expired token."
            )
            
        # Get user from database
        db = await self.get_db()
        try:
            user = await self.get_user_by_id(db, payload.get("sub"))
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
                
            # Add user to request state for use in route handlers
            request.state.user = user
            return user
        finally:
            await db.close()
    
    async def get_db(self) -> AsyncSession:
        """Get async database session"""
        async for session in get_db():
            return session
    
    async def get_user_by_id(self, db: AsyncSession, user_id: str) -> Optional[User]:
        """Get user by ID from database"""
        from sqlalchemy.future import select
        
        result = await db.execute(select(User).filter(User.id == user_id))
        return result.scalars().first()
    
    @staticmethod
    def verify_jwt(token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token and return payload if valid"""
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
                options={"verify_aud": False}
            )
            return payload
        except JWTError as e:
            return None

# Create instance of the middleware
auth_middleware = JWTBearer()

async def get_current_user(request: Request) -> User:
    """Dependency to get current user from request state"""
    if not hasattr(request.state, 'user'):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    return request.state.user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Dependency to get current active user"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user
