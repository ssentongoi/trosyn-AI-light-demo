"""
Gemini 3.1B AI Provider Implementation
"""

import os
from pathlib import Path
from typing import Dict, List, Optional, Union

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

from ..providers.base import BaseAIProvider


class GeminiProvider(BaseAIProvider):
    """Gemini 3.1B AI provider implementation."""

    def __init__(
        self,
        model_name: str = "google/gemma-3n-e2b",
        device: Optional[str] = None,
        model_path: Optional[Union[str, Path]] = None,
        **kwargs,
    ):
        """
        Initialize the Gemini 3.1B provider.

        Args:
            model_name: Name of the model to use (default: google/gemma-3b)
            device: Device to run the model on (cuda, mps, cpu)
            model_path: Path to local model weights (optional)
        """
        self.model_name = model_name
        self.device = device or (
            "cuda"
            if torch.cuda.is_available()
            else "mps" if torch.backends.mps.is_available() else "cpu"
        )
        self.model = None
        self.tokenizer = None
        self.model_path = Path(model_path) if model_path else None
        self._load_model()

    def _load_model(self):
        """Load the model and tokenizer."""
        try:
            print(f"Loading model {self.model_name} on device: {self.device}")

            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_path or self.model_name, trust_remote_code=True
            )

            # Load model
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_path or self.model_name,
                torch_dtype=torch.float16 if self.device != "cpu" else torch.float32,
                device_map="auto" if self.device != "cpu" else None,
                trust_remote_code=True,
            )

            if self.device == "cuda":
                self.model = self.model.cuda()
            elif self.device == "mps":
                self.model = self.model.to("mps")

            print(f"Model {self.model_name} loaded successfully on {self.device}")

        except Exception as e:
            print(f"Error loading model: {e}")
            raise

    def generate(
        self, prompt: str, max_tokens: int = 1024, temperature: float = 0.7, **kwargs
    ) -> str:
        """Generate text from a prompt."""
        try:
            inputs = self.tokenizer(prompt, return_tensors="pt")

            if self.device == "cuda":
                inputs = {k: v.cuda() for k, v in inputs.items()}
            elif self.device == "mps":
                inputs = {k: v.to("mps") for k, v in inputs.items()}

            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=max_tokens,
                    temperature=temperature,
                    do_sample=True,
                    pad_token_id=self.tokenizer.eos_token_id,
                    **kwargs,
                )

            generated_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            return generated_text

        except Exception as e:
            print(f"Error in generate: {e}")
            raise

    async def agenerate(
        self, prompt: str, max_tokens: int = 1024, temperature: float = 0.7, **kwargs
    ) -> str:
        """Asynchronously generate text from a prompt."""
        # For simplicity, we'll just call the synchronous version
        # In a production environment, you might want to use asyncio.to_thread
        return self.generate(prompt, max_tokens, temperature, **kwargs)

    def embed_text(self, text: str) -> List[float]:
        """Generate embeddings for a text."""
        # For now, return a dummy embedding
        # In a real implementation, you would use a proper embedding model
        return [0.0] * 768

    def get_token_count(self, text: str) -> int:
        """Get the number of tokens in a text."""
        return len(self.tokenizer.encode(text))
