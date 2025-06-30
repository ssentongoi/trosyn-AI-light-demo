from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.security.utils import get_authorization_scheme_param
from sqlalchemy.orm import Session
from jose.exceptions import ExpiredSignatureError

from app.database import get_db
from app.core.config import settings

# Configuration
SECRET_KEY = settings.SECRET_KEY
REFRESH_SECRET_KEY = settings.REFRESH_SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS
COOKIE_NAME = "refresh_token"

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/token")

class OAuth2PasswordBearerWithCookie(OAuth2PasswordBearer):
    """OAuth2 password flow with token in a httpOnly cookie."""
    async def __call__(self, request: Request) -> Optional[str]:
        # Check for token in Authorization header first
        authorization: str = request.headers.get("Authorization")
        if authorization:
            scheme, param = get_authorization_scheme_param(authorization)
            if scheme.lower() == "bearer":
                return param
        
        # Fall back to cookie
        token = request.cookies.get(COOKIE_NAME)
        if token:
            return token
        return None

# Use the custom OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearerWithCookie(tokenUrl=f"{settings.API_V1_STR}/auth/token")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate a password hash."""
    return pwd_context.hash(password)

def create_token(
    data: dict, 
    expires_delta: Optional[timedelta] = None,
    secret_key: str = SECRET_KEY,
    token_type: str = "access"
) -> str:
    """Create a JWT token (access or refresh)."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({
        "exp": expire,
        "type": token_type,
        "iat": datetime.utcnow(),
    })
    
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=ALGORITHM)
    return encoded_jwt

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create an access token."""
    if expires_delta is None:
        expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return create_token(data, expires_delta, SECRET_KEY, "access")

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a refresh token."""
    if expires_delta is None:
        expires_delta = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    return create_token(data, expires_delta, REFRESH_SECRET_KEY, "refresh")

def decode_token(token: str, is_refresh: bool = False):
    """Decode a JWT token."""
    secret_key = REFRESH_SECRET_KEY if is_refresh else SECRET_KEY
    try:
        payload = jwt.decode(token, secret_key, algorithms=[ALGORITHM])
        return payload
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

def set_refresh_token_cookie(response: Response, token: str) -> None:
    """Set the refresh token as an HTTP-only cookie."""
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,  # in seconds
        expires=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,  # in seconds
        secure=not settings.DEBUG,  # Only send over HTTPS in production
        samesite="lax",
    )

def remove_refresh_token_cookie(response: Response) -> None:
    """Remove the refresh token cookie."""
    response.delete_cookie(
        key=COOKIE_NAME,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
    )

async def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
):
    """Get the current user from the access token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = decode_token(token)
        if payload is None or payload.get("type") != "access":
            raise credentials_exception
            
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
    
    user = get_user(db, username)
    if user is None:
        raise credentials_exception
        
    return user

async def get_current_user_from_refresh_token(
    refresh_token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
):
    """Get the current user from the refresh token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = decode_token(refresh_token, is_refresh=True)
        if payload is None or payload.get("type") != "refresh":
            raise credentials_exception
            
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
    
    user = get_user(db, username)
    if user is None:
        raise credentials_exception
        
    return user

# Helper function to get user from database
def get_user(db: Session, username: str):
    # This is a placeholder - implement actual database query
    from app.models.user import User
    return db.query(User).filter(User.username == username).first()
