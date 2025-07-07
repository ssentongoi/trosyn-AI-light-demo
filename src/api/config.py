"""
Configuration settings for the Trosyn AI API.
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directory
BASE_DIR = Path(__file__).parent.parent.parent

class Settings(BaseSettings):
    """Application settings."""
    
    # Application
    APP_NAME: str = "Trosyn AI"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True
    
    # API
    API_V1_STR: str = "/v1"
    PROJECT_NAME: str = "Trosyn AI API"
    VERSION: str = "0.2.0"
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["*"]
    
    # Data directories
    DATA_DIR: str = str(BASE_DIR / "data")
    UPLOAD_DIR: str = str(Path(DATA_DIR) / "uploads")
    VECTOR_STORE_DIR: str = str(Path(DATA_DIR) / "chroma_db")
    
    # Document processing
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB
    SUPPORTED_FILE_TYPES: list[str] = [
        ".pdf", ".docx", ".pptx", ".xlsx", 
        ".txt", ".md", ".eml", ".msg", 
        ".rtf", ".odt", ".epub"
    ]
    
    # Model settings
    MODEL_NAME: str = "gemma-3-1b-it"
    MODEL_PATH: str = str(Path(DATA_DIR) / "models" / "gemma-3-1b-it-q8_0.gguf")
    MODEL_CONTEXT_SIZE: int = 8192
    MODEL_MAX_TOKENS: int = 2048
    MODEL_TEMPERATURE: float = 0.7
    MODEL_TOP_P: float = 0.9
    
    # Vector store
    VECTOR_STORE_COLLECTION: str = "documents"
    VECTOR_STORE_EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    
    # Security
    SECRET_KEY: str = "your-secret-key-here"  # Change in production
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str = f"sqlite:///{Path(DATA_DIR) / 'trosyn.db'}"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

# Global settings instance
settings = Settings()

# Create data directories if they don't exist
os.makedirs(settings.DATA_DIR, exist_ok=True)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(Path(settings.MODEL_PATH).parent, exist_ok=True)
