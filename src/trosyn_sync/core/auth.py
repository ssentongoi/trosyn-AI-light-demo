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
    """JWT token model."""
    access_token: str
    token_type: str = "bearer"

    model_config = ConfigDict(extra="ignore")


class TokenData(BaseModel):
    """Token payload data."""
    node_id: str
    node_type: str
    scopes: list[str] = []

    model_config = ConfigDict(extra="ignore")


class AuthSettings(BaseSettings):
    """Authentication settings."""
    secret_key: str = "your-secret-key-here"  # Change in production
    algorithm: str = JWT_ALGORITHM
    access_token_expire_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES

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
            Encoded JWT token
        """
        to_encode = {
            "sub": node_id,
            "node_type": node_type,
            "scopes": scopes or [],
        }
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(
                minutes=self.settings.access_token_expire_minutes
            )
            
        to_encode.update({"exp": expire})
        
        return jwt.encode(
            to_encode,
            self.settings.secret_key,
            algorithm=self.settings.algorithm
        )

    def verify_token(self, token: str) -> Optional[TokenData]:
        """Verify and decode a JWT token.
        
        Args:
            token: JWT token to verify
            
        Returns:
            TokenData if valid, None otherwise
        """
        try:
            payload = jwt.decode(
                token,
                self.settings.secret_key,
                algorithms=[self.settings.algorithm]
            )
            
            node_id: str = payload.get("sub")
            node_type: str = payload.get("node_type")
            scopes: list[str] = payload.get("scopes", [])
            
            if node_id is None or node_type is None:
                return None
                
            return TokenData(
                node_id=node_id,
                node_type=node_type,
                scopes=scopes
            )
            
        except JWTError:
            return None

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
        return self.create_access_token(
            node_id=node_id,
            node_type=node_type,
            expires_delta=expires_delta,
            scopes=["api_key"]
        )


# Singleton instance
auth_service = AuthService()


def get_auth_service() -> AuthService:
    """Dependency for FastAPI to get the auth service."""
    return auth_service
