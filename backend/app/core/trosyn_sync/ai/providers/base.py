"""
Base classes for AI providers.
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Dict, List, Optional, Union


class BaseAIProvider(ABC):
    """Base class for all AI providers."""

    @abstractmethod
    def generate(
        self, prompt: str, max_tokens: int = 1024, temperature: float = 0.7, **kwargs
    ) -> str:
        """Generate text from a prompt."""
        pass

    @abstractmethod
    async def agenerate(
        self, prompt: str, max_tokens: int = 1024, temperature: float = 0.7, **kwargs
    ) -> str:
        """Asynchronously generate text from a prompt."""
        pass

    @abstractmethod
    def embed_text(self, text: str) -> List[float]:
        """Generate embeddings for a text."""
        pass

    @abstractmethod
    def get_token_count(self, text: str) -> int:
        """Get the number of tokens in a text."""
        pass


class DocumentProcessor(ABC):
    """Base class for document processing."""

    @abstractmethod
    def process_document(self, file_path: Union[str, Path]) -> Dict:
        """Process a document and return structured data."""
        pass

    @abstractmethod
    def chunk_text(self, text: str, chunk_size: int = 1000) -> List[str]:
        """Split text into chunks of specified size."""
        pass
