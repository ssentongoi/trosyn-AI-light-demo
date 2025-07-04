"""
Authentication endpoints for Trosyn Sync API.

This module handles user authentication, token issuance, and token refresh.
"""
import logging
from datetime import timedelta, datetime, timezone
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from pydantic import BaseModel, Field, HttpUrl
from sqlalchemy.orm import Session

from ...core.auth import Token, get_auth_service, TokenData, AuthService
from ...core.discovery import DiscoveryService, get_discovery_service
from ...db import get_db
from ...services.token_service import TokenService, get_token_service

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/token")

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])


class LoginRequest(BaseModel):
    """Login request model."""
    username: str = Field(..., description="Node identifier")
    password: str = Field(..., description="API key or password")
    client_id: Optional[str] = Field(
        None,
        description="Client identifier for tracking"
    )


class TokenResponse(Token):
    """Token response model with additional metadata."""
    node_id: str
    node_type: str


@router.post(
    "/token",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtain an access token"
)
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    token_service: TokenService = Depends(get_token_service),
    discovery_service: DiscoveryService = Depends(get_discovery_service)
) -> TokenResponse:
    """
    OAuth2 compatible token login, get an access token for future requests.
    
    This endpoint authenticates a node and returns an access token and refresh token.
    The access token is short-lived (15 minutes by default) and the refresh token
    is long-lived (7 days by default).
    
    In a production environment, you would validate the username/password against
    your user database. For this implementation, we're using the node discovery
    service to validate node credentials.
    """
    
    # Get client information from request
    client_id = form_data.client_id
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None
    
    try:
        # In a real implementation, you would verify credentials here
        # For now, we'll use the node discovery service to validate the node
        node_info = discovery_service.get_node(form_data.username)
        if not node_info:
            logger.warning(f"Login failed: Node {form_data.username} not found")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid node credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # In a real implementation, you would verify the password here
        # For now, we'll just accept any password for known nodes
        
        # Create token pair using the token service
        token_pair, _ = token_service.create_token_pair(
            node_id=node_info.node_id,
            node_type=node_info.node_type,
            client_id=client_id,
            user_agent=user_agent,
            ip_address=ip_address,
            scopes=form_data.scopes
        )
        
        return TokenResponse(
            **token_pair.model_dump(),
            node_id=node_info.node_id,
            node_type=node_info.node_type
        )
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during authentication",
        )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Refresh an access token"
)
async def refresh_access_token(
    request: Request,
    refresh_token: str,
    token_service: TokenService = Depends(get_token_service)
) -> TokenResponse:
    """
    Refresh an access token using a valid refresh token.
    
    This endpoint issues a new access token and refresh token pair, invalidating
    the previous refresh token. This implements token rotation for better security.
    
    The client should use the new refresh token for the next refresh operation.
    The old refresh token will be invalidated and cannot be used again.
    """
    # Get client information from request
    client_id = request.headers.get("x-client-id")
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None
    
    try:
        # Rotate the refresh token using the token service
        result = token_service.rotate_refresh_token(
            refresh_token_str=refresh_token,
            client_id=client_id,
            user_agent=user_agent,
            ip_address=ip_address
        )
        
        if not result:
            logger.warning("Token refresh failed: Invalid or expired refresh token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        new_tokens, _ = result
        
        # Get node info from the new access token
        token_data = get_auth_service().verify_token(
            new_tokens.access_token,
            token_type="access"
        )
        
        if not token_data:
            logger.error("Token refresh failed: Invalid token data after rotation")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Invalid token data",
            )
        
        return TokenResponse(
            **new_tokens.model_dump(),
            node_id=token_data.node_id,
            node_type=token_data.node_type
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while refreshing the token",
        )


class TokenRevokeRequest(BaseModel):
    """Request model for token revocation."""
    token: str = Field(..., description="The refresh token to revoke")
    reason: Optional[str] = Field(None, description="Optional reason for revocation")


@router.post(
    "/revoke",
    status_code=status.HTTP_200_OK,
    summary="Revoke a refresh token",
    response_model=dict
)
async def revoke_token(
    request: TokenRevokeRequest,
    token_service: TokenService = Depends(get_token_service),
    current_user: TokenData = Depends(lambda: get_auth_service().verify_token(request.token, token_type="refresh"))
) -> dict:
    """
    Revoke a refresh token.
    
    This endpoint revokes a refresh token, preventing it from being used to
    obtain new access tokens. Only the owner of the token or an admin can revoke it.
    
    In a production environment, you might want to implement additional
    authorization checks to ensure users can only revoke their own tokens.
    """
    try:
        # Get the JTI from the token
        auth_service = get_auth_service()
        token_data = auth_service.verify_token(
            request.token,
            token_type="refresh"
        )
        
        if not token_data or not token_data.jti:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token format"
            )
        
        # Revoke the token
        success = token_service.revoke_token(
            token_jti=token_data.jti,
            revoked_by=current_user.node_id if current_user else None,
            reason=request.reason
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Token not found or already revoked"
            )
        
        return {"message": "Token revoked successfully"}
        
    except JWTError as e:
        logger.warning(f"Token revocation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token"
        )
    except Exception as e:
        logger.error(f"Token revocation error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while revoking the token"
        )


@router.get(
    "/tokens",
    response_model=List[Dict[str, Any]],
    summary="List active refresh tokens for the current node"
)
async def list_tokens(
    current_user: TokenData = Depends(lambda: get_auth_service().verify_token(Depends(oauth2_scheme))),
    token_service: TokenService = Depends(get_token_service),
    include_revoked: bool = False
) -> List[Dict[str, Any]]:
    """
    List all active refresh tokens for the current node.
    
    This endpoint returns a list of all refresh tokens associated with the
    current node's identity. Only tokens for the authenticated node are returned.
    """
    try:
        tokens = token_service.get_active_tokens(
            node_id=current_user.node_id,
            include_revoked=include_revoked
        )
        return [token.to_dict() for token in tokens]
    except Exception as e:
        logger.error(f"Error listing tokens: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving tokens"
        )


@router.post(
    "/cleanup",
    status_code=status.HTTP_200_OK,
    summary="Clean up expired tokens"
)
async def cleanup_tokens(
    token_service: TokenService = Depends(get_token_service)
) -> Dict[str, int]:
    """
    Clean up expired refresh tokens from the database.
    
    This endpoint removes all expired refresh tokens from the database.
    In a production environment, you might want to schedule this as a periodic task.
    """
    try:
        count = token_service.cleanup_expired_tokens()
        return {"message": f"Cleaned up {count} expired tokens"}
    except Exception as e:
        logger.error(f"Error cleaning up tokens: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while cleaning up tokens"
        )
