"""
Authentication and Authorization Service for Trosyn Sync.

This module handles JWT token generation/validation and API key management.
"""
import os
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import BaseModel, ConfigDict
from pydantic_settings import BaseSettings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Configuration
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours


class Token(BaseModel):
    """JWT token model with refresh token support."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # Token expiration in seconds

    model_config = ConfigDict(extra="ignore")


class TokenData(BaseModel):
    """Token payload data."""
    node_id: str
    node_type: str
    scopes: list[str] = []

    model_config = ConfigDict(extra="ignore")


class AuthSettings(BaseSettings):
    """Authentication settings with token rotation support."""
    secret_key: str = "your-secret-key-here"  # Change in production
    algorithm: str = JWT_ALGORITHM
    access_token_expire_minutes: int = 15  # Short-lived access token (15 minutes)
    refresh_token_expire_days: int = 7     # Long-lived refresh token (7 days)
    refresh_token_rotation_days: int = 1   # Rotate refresh tokens every 24 hours
    token_issuer: str = "trosyn-sync"
    token_audience: str = "trosyn-client"

    model_config = ConfigDict(
        env_file=".env",
        env_prefix="TROSYN_AUTH_",
        extra="ignore"
    )


class AuthService:
    """Handles authentication and authorization."""

    def __init__(self, settings: Optional[AuthSettings] = None):
        self.settings = settings or AuthSettings()

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against a hash."""
        return pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        """Generate a password hash."""
        return pwd_context.hash(password)

    def _create_token(
        self,
        node_id: str,
        node_type: str,
        expires_delta: timedelta,
        token_type: str = "access",
        scopes: Optional[list[str]] = None,
        jti: Optional[str] = None
    ) -> str:
        """Create a JWT token with the given parameters.
        
        Args:
            node_id: Unique node identifier
            node_type: Type of node
            expires_delta: Expiration time delta
            token_type: Type of token ('access' or 'refresh')
            scopes: List of permission scopes
            jti: Optional JWT ID for refresh token tracking
            
        Returns:
            Encoded JWT token
        """
        now = datetime.utcnow()
        expire = now + expires_delta
        
        to_encode = {
            "sub": node_id,
            "node_type": node_type,
            "scopes": scopes or [],
            "iat": now,
            "exp": expire,
            "iss": self.settings.token_issuer,
            "aud": self.settings.token_audience,
            "type": token_type
        }
        
        if jti:
            to_encode["jti"] = jti
            
        return jwt.encode(
            to_encode,
            self.settings.secret_key,
            algorithm=self.settings.algorithm
        )
        
    def create_access_token(
        self,
        node_id: str,
        node_type: str,
        expires_delta: Optional[timedelta] = None,
        scopes: Optional[list[str]] = None
    ) -> str:
        """Create a new JWT access token.
        
        Args:
            node_id: Unique node identifier
            node_type: Type of node ('TROSYSN_ADMIN_HUB' or 'TROSYSN_DEPT_NODE')
            expires_delta: Optional expiration time delta
            scopes: List of permission scopes
            
        Returns:
            Encoded JWT access token
        """
        expires_delta = expires_delta or timedelta(
            minutes=self.settings.access_token_expire_minutes
        )
        return self._create_token(
            node_id=node_id,
            node_type=node_type,
            expires_delta=expires_delta,
            token_type="access",
            scopes=scopes
        )
        
    def create_refresh_token(
        self,
        node_id: str,
        node_type: str,
        expires_delta: Optional[timedelta] = None,
        scopes: Optional[list[str]] = None,
        jti: Optional[str] = None
    ) -> str:
        """Create a new JWT refresh token.
        
        Args:
            node_id: Unique node identifier
            node_type: Type of node
            expires_delta: Optional expiration time delta
            scopes: List of permission scopes
            jti: Optional JWT ID for refresh token tracking
            
        Returns:
            Encoded JWT refresh token
        """
        expires_delta = expires_delta or timedelta(
            days=self.settings.refresh_token_expire_days
        )
        return self._create_token(
            node_id=node_id,
            node_type=node_type,
            expires_delta=expires_delta,
            token_type="refresh",
            scopes=scopes,
            jti=jti
        )
        
    def create_token_pair(
        self,
        node_id: str,
        node_type: str,
        access_token_expires: Optional[timedelta] = None,
        refresh_token_expires: Optional[timedelta] = None,
        scopes: Optional[list[str]] = None,
        refresh_token_jti: Optional[str] = None
    ) -> Token:
        """Create a new access/refresh token pair.
        
        Args:
            node_id: Unique node identifier
            node_type: Type of node
            access_token_expires: Optional expiration time delta for access token
            refresh_token_expires: Optional expiration time delta for refresh token
            scopes: List of permission scopes
            refresh_token_jti: Optional JWT ID for refresh token tracking
            
        Returns:
            Token object with access and refresh tokens
        """
        access_token = self.create_access_token(
            node_id=node_id,
            node_type=node_type,
            expires_delta=access_token_expires,
            scopes=scopes
        )
        
        refresh_token = self.create_refresh_token(
            node_id=node_id,
            node_type=node_type,
            expires_delta=refresh_token_expires,
            scopes=scopes,
            jti=refresh_token_jti
        )
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=int((datetime.utcnow() + (access_token_expires or 
                timedelta(minutes=self.settings.access_token_expire_minutes)) - 
                datetime.utcnow()).total_seconds())
        )

    def verify_token(
        self, 
        token: str, 
        token_type: Optional[str] = None,
        audience: Optional[str] = None,
        issuer: Optional[str] = None
    ) -> Optional[TokenData]:
        """Verify and decode a JWT token.
        
        Args:
            token: JWT token to verify
            token_type: Expected token type ('access' or 'refresh')
            audience: Expected audience
            issuer: Expected issuer
            
        Returns:
            TokenData if valid, None otherwise
        """
        try:
            # Decode token with verification
            payload = jwt.decode(
                token,
                self.settings.secret_key,
                algorithms=[self.settings.algorithm],
                audience=audience or self.settings.token_audience,
                issuer=issuer or self.settings.token_issuer
            )
            
            # Validate required claims
            node_id = payload.get("sub")
            node_type = payload.get("node_type")
            
            if not node_id or not node_type:
                return None
                
            # Validate token type if specified
            if token_type and payload.get("type") != token_type:
                return None
            
            # Check if token is expired
            exp = payload.get("exp")
            if exp and datetime.utcnow() > datetime.fromtimestamp(exp, tz=timezone.utc):
                return None
                
            return TokenData(
                node_id=node_id,
                node_type=node_type,
                scopes=payload.get("scopes", [])
            )
            
        except JWTError as e:
            logger.warning(f"Token verification failed: {e}")
            return None
            
    def rotate_refresh_token(
        self, 
        refresh_token: str,
        revoke_old: bool = True
    ) -> Optional[Token]:
        """Rotate a refresh token, invalidating the old one.
        
        Args:
            refresh_token: The refresh token to rotate
            revoke_old: Whether to revoke the old token
            
        Returns:
            New Token object if rotation successful, None otherwise
        """
        # Verify the refresh token
        token_data = self.verify_token(
            refresh_token,
            token_type="refresh",
            audience=self.settings.token_audience,
            issuer=self.settings.token_issuer
        )
        
        if not token_data:
            return None
            
        # Here you would typically check if the token is revoked in your database
        # and implement token blacklisting if needed
        
        # Create new token pair with rotated refresh token
        new_token_pair = self.create_token_pair(
            node_id=token_data.node_id,
            node_type=token_data.node_type,
            scopes=token_data.scopes,
            # Optionally set a new JTI for the new refresh token
            refresh_token_jti=os.urandom(16).hex()
        )
        
        # Here you would store the new refresh token and optionally revoke the old one
        # in your database
        
        return new_token_pair

    def generate_api_key(self, node_id: str, node_type: str) -> str:
        """Generate a new API key for a node.
        
        Args:
            node_id: Unique node identifier
            node_type: Type of node
            
        Returns:
            Generated API key (JWT token)
        """
        # API keys have a longer expiration (30 days)
        expires_delta = timedelta(days=30)
        return self.create_token_pair(
            node_id=node_id,
            node_type=node_type,
            access_token_expires=expires_delta,
            refresh_token_expires=expires_delta,
            scopes=["api_key"]
        ).access_token


# Singleton instance
auth_service = AuthService()


def get_auth_service() -> AuthService:
    """Dependency for FastAPI to get the auth service."""
    return auth_service
