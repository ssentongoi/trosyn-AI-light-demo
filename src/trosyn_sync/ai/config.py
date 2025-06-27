"""
Configuration for AI services.
"""
import os
from pathlib import Path
from typing import Optional

from trosyn_sync.config import settings

class AIConfig:
    """Configuration for AI services."""
    
    # Model settings
    MODEL_NAME = os.getenv("AI_MODEL_NAME", "google/gemma-3b")
    MODEL_PATH = os.getenv("AI_MODEL_PATH")
    DEVICE = os.getenv("AI_DEVICE")  # cuda, mps, or cpu
    
    # Generation settings
    MAX_TOKENS = int(os.getenv("AI_MAX_TOKENS", "1024"))
    TEMPERATURE = float(os.getenv("AI_TEMPERATURE", "0.7"))
    TOP_P = float(os.getenv("AI_TOP_P", "0.9"))
    
    # Document processing
    CHUNK_SIZE = int(os.getenv("AI_CHUNK_SIZE", "1000"))
    MAX_DOCUMENT_SIZE = int(os.getenv("AI_MAX_DOCUMENT_SIZE", str(10 * 1024 * 1024)))  # 10MB
    
    # Memory settings
    USE_MEMORY = os.getenv("AI_USE_MEMORY", "true").lower() == "true"
    MAX_MEMORY_ITEMS = int(os.getenv("AI_MAX_MEMORY_ITEMS", "100"))
    
    @classmethod
    def get_model_path(cls) -> Optional[Path]:
        """Get the model path, creating it if it doesn't exist."""
        if not cls.MODEL_PATH:
            return None
            
        model_path = Path(cls.MODEL_PATH)
        model_path.mkdir(parents=True, exist_ok=True)
        return model_path

# Create a singleton instance
config = AIConfig()
