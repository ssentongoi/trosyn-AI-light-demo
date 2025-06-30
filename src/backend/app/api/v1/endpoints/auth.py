from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Any, Optional

from ....core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
    set_refresh_token_cookie,
    remove_refresh_token_cookie,
    get_current_user_from_refresh_token,
    get_current_user,
)
from ....core.config import settings
from ....database import get_db
from ....schemas.response import Token, TokenData, UserResponse, UserCreate, LoginResponse
from ....schemas.user import User as UserSchema
from ....models.user import User as UserModel
from ....services.user import get_user_by_username, get_user_by_email, create_user

router = APIRouter()

def get_user(db: Session, username: str):
    """Get user by username"""
    return db.query(UserModel).filter(UserModel.username == username).first()

@router.post("/token", response_model=Token)
async def login_for_access_token(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    Sets an HTTP-only cookie with the refresh token.
    """
    user = get_user_by_username(db, username=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token = create_refresh_token(
        data={"sub": user.username}, expires_delta=refresh_token_expires
    )
    
    # Calculate expiration time for the access token
    from datetime import datetime, timezone
    expires_at = datetime.now(timezone.utc) + access_token_expires
    
    # Set refresh token in HTTP-only cookie
    set_refresh_token_cookie(response, refresh_token)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_at": expires_at,
        "user": UserSchema.from_orm(user)
    }

@router.post("/refresh", response_model=Token)
async def refresh_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """Refresh access token using the refresh token from cookies"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Get refresh token from cookie
        refresh_token = request.cookies.get("refresh_token")
        if not refresh_token:
            raise credentials_exception
            
        # Validate refresh token and get user
        user = await get_current_user_from_refresh_token(refresh_token, db)
        if not user:
            raise credentials_exception
            
        # Create new access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        new_access_token = create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )
        
        # Optionally rotate refresh token (uncomment to enable)
        # refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        # new_refresh_token = create_refresh_token(
        #     data={"sub": user.username}, expires_delta=refresh_token_expires
        # )
        # set_refresh_token_cookie(response, new_refresh_token)
        
        return {
            "access_token": new_access_token,
            "token_type": "bearer",
            "user": UserSchema.from_orm(user)
        }
        
    except Exception as e:
        # Clear invalid refresh token
        remove_refresh_token_cookie(response)
        raise credentials_exception

@router.post("/logout")
async def logout(response: Response):
    """Logout user by removing the refresh token cookie"""
    remove_refresh_token_cookie(response)
    return {"message": "Successfully logged out"}

@router.post("/register", response_model=UserSchema)
async def register_user(
    user_in: UserCreate,
    db: Session = Depends(get_db)
) -> Any:
    """Create new user"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Starting user registration for username: {user_in.username}")
        
        # Check if username already exists
        logger.debug("Checking if username exists")
        user = get_user_by_username(db, username=user_in.username)
        if user:
            logger.warning(f"Username {user_in.username} already exists")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered",
            )
        
        # Check if email already exists
        logger.debug("Checking if email exists")
        if get_user_by_email(db, email=user_in.email):
            logger.warning(f"Email {user_in.email} already exists")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        
        logger.debug("Creating new user")
        user = create_user(db=db, user=user_in)
        logger.info(f"Successfully created user with id: {user.id}")
        return user
        
    except HTTPException as http_exc:
        # Re-raise HTTP exceptions
        logger.warning(f"HTTP Exception: {str(http_exc)}")
        raise http_exc
    except Exception as e:
        # Log any unexpected errors
        logger.error(f"Error during user registration: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during registration: {str(e)}",
        )

@router.get("/me", response_model=UserSchema)
async def read_users_me(current_user: UserModel = Depends(get_current_user)):
    """Get current user"""
    return current_user
