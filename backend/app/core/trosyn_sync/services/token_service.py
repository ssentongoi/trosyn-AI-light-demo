"""
Token management service for handling JWT refresh tokens.

This service provides functionality for managing refresh tokens in the database,
including creation, validation, rotation, and revocation.
"""
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, Dict, Any, List

from jose import JWTError
from sqlalchemy.orm import Session
from fastapi import Depends

from ..core.auth import Token, TokenData, get_auth_service
from ..db import get_db
from ..models.auth import RefreshToken, AuthAuditLog

logger = logging.getLogger(__name__)

class TokenService:
    """Service for managing JWT refresh tokens."""
    
    def __init__(self, db_session: Session):
        """Initialize the token service.
        
        Args:
            db_session: SQLAlchemy database session
        """
        self.db = db_session
        self.auth_service = get_auth_service()
    
    def create_token_pair(
        self,
        node_id: str,
        node_type: str,
        client_id: Optional[str] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        scopes: Optional[List[str]] = None,
        parent_token_jti: Optional[str] = None
    ) -> Tuple[Token, RefreshToken]:
        """Create a new access/refresh token pair and store the refresh token.
        
        Args:
            node_id: ID of the node this token is for
            node_type: Type of the node
            client_id: Optional client identifier
            user_agent: Optional user agent string
            ip_address: Optional IP address of the client
            scopes: Optional list of scopes for the token
            parent_token_jti: Optional JTI of the parent token (for token rotation)
            
        Returns:
            Tuple of (Token, RefreshToken) where Token is the access/refresh token pair
            and RefreshToken is the database record
        """
        # Generate a unique JTI for the refresh token
        jti = os.urandom(16).hex()
        
        # Create the token pair
        token_pair = self.auth_service.create_token_pair(
            node_id=node_id,
            node_type=node_type,
            scopes=scopes,
            refresh_token_jti=jti
        )
        
        # Store the refresh token in the database
        refresh_token = RefreshToken(
            jti=jti,
            token=token_pair.refresh_token,  # In production, store a hash instead
            node_id=node_id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),  # Match token expiration
            client_id=client_id,
            user_agent=user_agent,
            ip_address=ip_address,
            scopes=scopes,
            parent_jti=parent_token_jti
        )
        
        self.db.add(refresh_token)
        
        # Log the token creation
        AuthAuditLog.log_event(
            event_type="token_created",
            node_id=node_id,
            token_jti=jti,
            client_id=client_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details={"scopes": scopes, "parent_jti": parent_token_jti},
            db_session=self.db
        )
        
        self.db.commit()
        
        return token_pair, refresh_token
    
    def rotate_refresh_token(
        self,
        refresh_token_str: str,
        client_id: Optional[str] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Optional[Tuple[Token, RefreshToken]]:
        """Rotate a refresh token, invalidating the old one and issuing a new one.
        
        Args:
            refresh_token_str: The refresh token to rotate
            client_id: Optional client identifier
            user_agent: Optional user agent string
            ip_address: Optional IP address of the client
            
        Returns:
            Tuple of (Token, RefreshToken) if rotation was successful, None otherwise
        """
        # Verify the refresh token
        token_data = self.auth_service.verify_token(
            refresh_token_str,
            token_type="refresh"
        )
        
        if not token_data:
            return None
        
        # Get the refresh token from the database
        refresh_token = self.db.query(RefreshToken).filter(
            RefreshToken.jti == token_data.jti,
            RefreshToken.is_revoked == False,
            RefreshToken.expires_at > datetime.now(timezone.utc)
        ).first()
        
        if not refresh_token:
            return None
        
        # Revoke the old token
        refresh_token.revoke()
        refresh_token.last_used_at = datetime.now(timezone.utc)
        
        # Log the token usage
        AuthAuditLog.log_event(
            event_type="token_rotated",
            node_id=token_data.node_id,
            token_jti=refresh_token.jti,
            client_id=client_id or refresh_token.client_id,
            ip_address=ip_address or refresh_token.ip_address,
            user_agent=user_agent or refresh_token.user_agent,
            db_session=self.db
        )
        
        # Create a new token pair
        return self.create_token_pair(
            node_id=token_data.node_id,
            node_type=token_data.node_type,
            client_id=client_id or refresh_token.client_id,
            user_agent=user_agent or refresh_token.user_agent,
            ip_address=ip_address or refresh_token.ip_address,
            scopes=token_data.scopes,
            parent_token_jti=refresh_token.jti
        )
    
    def revoke_token(
        self,
        token_jti: str,
        revoked_by: Optional[str] = None,
        reason: Optional[str] = None
    ) -> bool:
        """Revoke a refresh token by its JTI.
        
        Args:
            token_jti: The JTI of the token to revoke
            revoked_by: Optional user ID who is revoking the token
            reason: Optional reason for revocation
            
        Returns:
            True if the token was found and revoked, False otherwise
        """
        token = self.db.query(RefreshToken).filter(
            RefreshToken.jti == token_jti,
            RefreshToken.is_revoked == False
        ).first()
        
        if not token:
            return False
        
        # Revoke the token and all its children
        token.revoke(revoked_by=revoked_by)
        
        # Log the revocation
        AuthAuditLog.log_event(
            event_type="token_revoked",
            node_id=token.node_id,
            token_jti=token_jti,
            client_id=token.client_id,
            ip_address=token.ip_address,
            user_agent=token.user_agent,
            details={
                "revoked_by": revoked_by,
                "reason": reason,
                "token_expired": token.expires_at <= datetime.now(timezone.utc)
            },
            db_session=self.db
        )
        
        self.db.commit()
        return True
    
    def get_active_tokens(
        self,
        node_id: str,
        include_revoked: bool = False
    ) -> List[RefreshToken]:
        """Get all active refresh tokens for a node.
        
        Args:
            node_id: The ID of the node
            include_revoked: Whether to include revoked tokens
            
        Returns:
            List of RefreshToken objects
        """
        query = self.db.query(RefreshToken).filter(
            RefreshToken.node_id == node_id
        )
        
        if not include_revoked:
            query = query.filter(
                RefreshToken.is_revoked == False,
                RefreshToken.expires_at > datetime.now(timezone.utc)
            )
        
        return query.order_by(RefreshToken.created_at.desc()).all()
    
    def cleanup_expired_tokens(self) -> int:
        """Clean up expired refresh tokens from the database.
        
        Returns:
            Number of tokens that were cleaned up
        """
        expired_tokens = self.db.query(RefreshToken).filter(
            RefreshToken.expires_at <= datetime.now(timezone.utc)
        ).all()
        
        count = len(expired_tokens)
        
        for token in expired_tokens:
            # Only log if the token wasn't already revoked
            if not token.is_revoked:
                AuthAuditLog.log_event(
                    event_type="token_expired",
                    node_id=token.node_id,
                    token_jti=token.jti,
                    client_id=token.client_id,
                    ip_address=token.ip_address,
                    user_agent=token.user_agent,
                    db_session=self.db
                )
            self.db.delete(token)
        
        if count > 0:
            self.db.commit()
        
        return count


def get_token_service(db: Session = Depends(get_db)) -> "TokenService":
    """Dependency for getting a token service instance."""
    return TokenService(db)
