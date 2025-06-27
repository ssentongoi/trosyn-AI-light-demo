"""
Configuration settings for the Trosyn Sync service.
"""
import os
from pathlib import Path
from pathlib import Path
from typing import Any, Optional

from pydantic import field_validator, ConfigDict, Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Application
    APP_NAME: str = "Trosyn Sync"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    WORKERS: int = int(os.getenv("WORKERS", "1"))
    
    # Node
    NODE_ID: str = os.getenv("NODE_ID", "local-node")
    NODE_TYPE: str = os.getenv("NODE_TYPE", "TROSYSN_DEPT_NODE")
    NODE_DISPLAY_NAME: str = os.getenv("NODE_DISPLAY_NAME", "Local Node")
    
    # Storage
    STORAGE_ROOT: Path = Path(os.getenv("STORAGE_ROOT", "storage")).resolve()
    DOCUMENTS_DIR: Path = STORAGE_ROOT / "documents"
    VERSIONS_DIR: Path = STORAGE_ROOT / "versions"
    TMP_DIR: Path = STORAGE_ROOT / "tmp"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{STORAGE_ROOT}/trosyn_sync.db"
    )
    
    # Authentication
    SECRET_KEY: str = os.getenv("SECRET_KEY", "insecure-secret-key")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours
    
    # Sync
    SYNC_INTERVAL: int = int(os.getenv("SYNC_INTERVAL", "300"))  # 5 minutes
    MAX_RETRY_ATTEMPTS: int = int(os.getenv("MAX_RETRY_ATTEMPTS", "3"))
    
    # Memory Engine
    MEMORY_STORAGE_PATH: Path = STORAGE_ROOT / "memory"
    MEMORY_ENCRYPTION_KEY: Optional[bytes] = os.getenv("MEMORY_ENCRYPTION_KEY", None)
    MEMORY_MAX_SIZE_MB: int = int(os.getenv("MEMORY_MAX_SIZE_MB", "10"))  # Max memory file size in MB
    MEMORY_MAX_INTERACTIONS: int = int(os.getenv("MEMORY_MAX_INTERACTIONS", "1000"))  # Max number of interactions to keep
    
    @field_validator('MEMORY_ENCRYPTION_KEY', mode='before')
    @classmethod
    def validate_encryption_key(cls, v: Optional[str]) -> Optional[bytes]:
        if v is None or v.lower() == "none":
            return None
        try:
            return v.encode('utf-8')
        except Exception as e:
            raise ValueError(f"Invalid encryption key: {e}")
    
    # Discovery
    DISCOVERY_ENABLED: bool = os.getenv("DISCOVERY_ENABLED", "true").lower() == "true"
    DISCOVERY_MULTICAST_GROUP: str = os.getenv("DISCOVERY_MULTICAST_GROUP", "239.255.255.250")
    DISCOVERY_PORT: int = int(os.getenv("DISCOVERY_PORT", "1900"))
    DISCOVERY_INTERVAL: int = int(os.getenv("DISCOVERY_INTERVAL", "30"))  # seconds
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT: str = os.getenv(
        "LOG_FORMAT", 
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    model_config = ConfigDict(
        case_sensitive=True,
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )
    
    @field_validator("STORAGE_ROOT", "DOCUMENTS_DIR", "VERSIONS_DIR", "TMP_DIR", mode='before')
    @classmethod
    def create_dirs(cls, v: Path) -> Path:
        """Create storage directories if they don't exist."""
        if v is not None:
            v = Path(v)
            v.mkdir(parents=True, exist_ok=True)
        return v


# Create settings instance
settings = Settings()

# Ensure storage directories exist
settings.STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
settings.DOCUMENTS_DIR.mkdir(exist_ok=True)
settings.VERSIONS_DIR.mkdir(exist_ok=True)
settings.TMP_DIR.mkdir(exist_ok=True)
