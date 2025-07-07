from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional
import os
from pathlib import Path

# Determine the base directory of the project
BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Trosyn AI"
    VERSION: str = "1.0.0"
    DEBUG: bool = True  # Set to False in production
    
    # Security
    SECRET_KEY: str = "your-secret-key-here"  # Change this in production
    REFRESH_SECRET_KEY: str = "your-refresh-secret-key-here"  # Change this in production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30  # 30 days
    
    # Database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/trosyn_ai.db"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    # Model Config
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding='utf-8',
        case_sensitive=True,
        extra='ignore'
    )

# Create settings instance
settings = Settings()

# For debugging: Print settings to verify they're being loaded correctly
if __name__ == "__main__":
    import json
    print("Current settings:")
    print(json.dumps(settings.model_dump(), indent=2))
