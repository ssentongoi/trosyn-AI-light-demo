import secrets
import string
from pathlib import Path
from typing import List, Optional

from pydantic import field_validator, model_validator, HttpUrl, AnyHttpUrl
from pydantic_core.core_schema import FieldValidationInfo
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application configuration
    ENVIRONMENT: str = "development"  # development, staging, production
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    
    # Node configuration
    NODE_ID: str = ""  # Auto-generated if not set
    NODE_NAME: str = "Trosyn Node"
    SYNC_INTERVAL: int = 10  # seconds between sync attempts
    SYNC_PORT: int = 8000
    
    # Security configuration
    SECRET_KEY: str = ""  # Required for JWT signing
    SYNC_TOKEN: str = ""  # Required for node authentication
    
    # Token configuration
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # JWT token expiration
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # Refresh token expiration
    
    # Rate limiting
    RATE_LIMIT_REQUESTS: int = 100  # Max requests per window
    RATE_LIMIT_WINDOW: int = 60  # Time window in seconds
    
    # Security headers
    ENABLE_CSP: bool = True  # Content Security Policy
    ENABLE_HSTS: bool = True  # HTTP Strict Transport Security
    TRUSTED_ORIGINS: List[str] = ["http://localhost:3000"]
    
    # Node authentication
    ALLOWED_NODE_IDS: List[str] = []  # Empty list allows all nodes
    REQUIRE_NODE_AUTH: bool = True  # Require node authentication
    
    # File storage
    DATA_DIR: Path = Path("./data")
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    # Logging
    LOG_FILE: Optional[Path] = None
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
        env_prefix="TROSYNC_",
    )
    
    @field_validator("SECRET_KEY", mode="before")
    @classmethod
    def validate_secret_key(cls, v: Optional[str]) -> str:
        if not v:
            if cls.model_fields["ENVIRONMENT"].default == "production":
                raise ValueError("SECRET_KEY must be set in production")
            # Generate a random secret key for development
            alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
            return "".join(secrets.choice(alphabet) for _ in range(50))
        return v
    
    @field_validator("NODE_ID", mode="before")
    @classmethod
    def set_node_id(cls, v: Optional[str]) -> str:
        if not v:
            # Generate a random node ID if not set
            return f"node_{secrets.token_hex(8)}"
        return v
    
    @field_validator("LOG_LEVEL")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        v = v.upper()
        if v not in ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]:
            raise ValueError("LOG_LEVEL must be one of: DEBUG, INFO, WARNING, ERROR, CRITICAL")
        return v
    
    @field_validator("SYNC_PORT")
    @classmethod
    def validate_port(cls, v: int) -> int:
        if not (0 < v <= 65535):
            raise ValueError("SYNC_PORT must be between 1 and 65535")
        return v
    
    @model_validator(mode="after")
    def validate_settings(self) -> 'Settings':
        # Ensure data directory exists
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        
        # Set log file path if not set
        if self.LOG_FILE is None:
            self.LOG_FILE = self.DATA_DIR / "trosync.log"
        
        # In production, enforce secure settings
        if self.ENVIRONMENT == "production":
            if not self.SECRET_KEY or len(self.SECRET_KEY) < 32:
                raise ValueError("SECRET_KEY must be at least 32 characters in production")
            if not self.SYNC_TOKEN:
                raise ValueError("SYNC_TOKEN must be set in production")
            self.DEBUG = False
            self.LOG_LEVEL = max("INFO", self.LOG_LEVEL)  # Don't allow DEBUG in production
        
        return self


# Initialize settings
settings = Settings()

# Ensure data directory exists
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
