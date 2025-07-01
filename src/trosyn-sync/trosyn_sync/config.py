from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    NODE_ID: str = "default-node"
    NODE_NAME: str = "Trosyn Node"
    SYNC_INTERVAL: int = 10
    SECRET_KEY: str = "a_very_secret_key_that_should_be_changed"
    ALLOWED_NODE_IDS: List[str] = ["node-main-hub", "node-child-app-1"]
    LOG_LEVEL: str = "INFO"
    SYNC_PORT: int = 8000
    SYNC_TOKEN: str = "default-sync-token-change-me"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
