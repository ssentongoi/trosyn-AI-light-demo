import time
from datetime import datetime, timedelta
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.security.utils import get_authorization_scheme_param

from ..config import settings

# Security constants
ALGORITHM = "HS256"
TOKEN_TYPE = "bearer"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

# Rate limiting storage (in-memory, consider Redis for production)
_rate_limits = {}


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a new JWT access token with expiration.
    
    Args:
        data: Dictionary containing token claims
        expires_delta: Optional timedelta for token expiration
        
    Returns:
        str: Encoded JWT token
    """
    if not settings.SECRET_KEY:
        raise ValueError("SECRET_KEY must be set in configuration")
        
    to_encode = data.copy()
    
    # Set token expiration
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str = Depends(oauth2_scheme)) -> str:
    """
    Verifies the JWT token and checks if the node is allowed.
    
    Args:
        token: JWT token to verify
        
    Returns:
        str: Node ID if verification is successful
        
    Raises:
        HTTPException: If token is invalid or node is not authorized
    """
    # Check if token is provided
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Verify token signature and expiration
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
            options={"require": ["exp", "iat", "sub"]},
        )
        
        node_id: str = payload.get("sub")
        if not node_id:
            raise credentials_exception
            
        # Check if node is in allowed list
        if settings.ALLOWED_NODE_IDS and node_id not in settings.ALLOWED_NODE_IDS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Node not authorized",
            )
            
        return node_id
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def check_rate_limit(request: Request, key: str, limit: int, window: int) -> bool:
    """
    Simple in-memory rate limiting.
    
    Args:
        request: FastAPI request object
        key: Rate limit key (e.g., IP + endpoint)
        limit: Maximum number of requests
        window: Time window in seconds
        
    Returns:
        bool: True if request is allowed, False if rate limited
    """
    current_time = time.time()
    window_start = current_time - window
    
    # Clean up old entries
    _rate_limits[key] = [t for t in _rate_limits.get(key, []) if t > window_start]
    
    # Check rate limit
    if len(_rate_limits.get(key, [])) >= limit:
        return False
    
    # Add current request
    if key not in _rate_limits:
        _rate_limits[key] = []
    _rate_limits[key].append(current_time)
    
    return True
