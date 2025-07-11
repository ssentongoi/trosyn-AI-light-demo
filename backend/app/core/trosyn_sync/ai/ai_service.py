"""
AI Service for Trosyn AI
"""
import os
import logging
from typing import Dict, List, Optional, Union, Any
from pathlib import Path

from .providers.gemini import GeminiProvider
from .providers.document_processor import UnstructuredDocumentProcessor
from ..memory import MemoryEngine

logger = logging.getLogger(__name__)

class AIService:
    """
    Main AI service that coordinates between different AI components.
    """
    
    def __init__(
        self,
        model_name: str = "google/gemma-3n-e2b",
        model_path: Optional[Union[str, Path]] = None,
        device: Optional[str] = None,
        memory_engine: Optional[MemoryEngine] = None,
    ):
        """
        Initialize the AI service.
        
        Args:
            model_name: Name of the model to use
            model_path: Path to local model weights (optional)
            device: Device to run the model on (cuda, mps, cpu)
            memory_engine: Optional memory engine for context
        """
        self.model_name = model_name
        self.model_path = Path(model_path) if model_path else None
        self.device = device
        self.memory_engine = memory_engine
        
        # Initialize providers
        self.llm_provider = GeminiProvider(
            model_name=model_name,
            model_path=model_path,
            device=device
        )
        
        self.doc_processor = UnstructuredDocumentProcessor()
        
        logger.info(f"AI Service initialized with model: {model_name}")
    
    async def generate(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]] = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
        use_memory: bool = True,
        **kwargs
    ) -> str:
        """
        Generate a response to a prompt, optionally using memory context.
        
        Args:
            prompt: The input prompt
            context: Additional context to include
            max_tokens: Maximum number of tokens to generate
            temperature: Sampling temperature
            use_memory: Whether to use memory context
            
        Returns:
            Generated text response
        """
        try:
            # Prepare the full prompt with context
            full_prompt = self._prepare_prompt(prompt, context, use_memory)
            
            # Generate response
            response = await self.llm_provider.agenerate(
                prompt=full_prompt,
                max_tokens=max_tokens,
                temperature=temperature,
                **kwargs
            )
            
            # Store interaction in memory
            if use_memory and self.memory_engine:
                self.memory_engine.add_interaction(
                    query=prompt,
                    response=response,
                    metadata={
                        'model': self.model_name,
                        'temperature': temperature,
                        'context_used': bool(context)
                    }
                )
            
            return response
            
        except Exception as e:
            logger.error(f"Error in generate: {str(e)}")
            raise
    
    def process_document(
        self,
        file_path: Union[str, Path],
        chunk_size: int = 1000
    ) -> Dict:
        """
        Process a document and return structured data.
        
        Args:
            file_path: Path to the document file
            chunk_size: Size of text chunks (in characters)
            
        Returns:
            Dictionary containing document metadata and chunks
        """
        try:
            result = self.doc_processor.process_document(file_path)
            
            # Store document in memory if memory engine is available
            if self.memory_engine:
                self.memory_engine.update_context({
                    'documents': [{
                        'file_name': result['file_name'],
                        'file_path': result['file_path'],
                        'file_type': result['file_type'],
                        'processed_at': str(result.get('processed_at', '')),
                        'num_chunks': result['num_chunks']
                    }]
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing document {file_path}: {str(e)}")
            raise
    
    def _prepare_prompt(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]] = None,
        use_memory: bool = True
    ) -> str:
        """
        Prepare the full prompt with context and memory.
        
        Args:
            prompt: Original user prompt
            context: Additional context
            use_memory: Whether to include memory context
            
        Returns:
            Formatted prompt string
        """
        parts = []
        
        # Add system prompt
        parts.append("You are a helpful AI assistant.")
        
        # Add memory context if available
        if use_memory and self.memory_engine:
            memory_context = self.memory_engine.get_context_summary()
            if memory_context:
                parts.append("\n=== CONTEXT ===")
                parts.append(str(memory_context))
        
        # Add additional context
        if context:
            parts.append("\n=== ADDITIONAL CONTEXT ===")
            parts.append(str(context))
        
        # Add the user prompt
        parts.append("\n=== USER PROMPT ===")
        parts.append(prompt)
        
        return "\n".join(parts)
    
    def get_token_count(self, text: str) -> int:
        """Get the number of tokens in a text."""
        return self.llm_provider.get_token_count(text)
    
    def embed_text(self, text: str) -> List[float]:
        """Generate embeddings for a text."""
        return self.llm_provider.embed_text(text)
