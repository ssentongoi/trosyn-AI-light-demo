import os
from typing import List, Dict, Any
from collections.abc import AsyncGenerator
from dotenv import load_dotenv
from llama_cpp import Llama

# Load environment variables
load_dotenv()

class AIService:
    """Service class for handling AI-related operations using Gemini 3N (local LLM)."""
    def __init__(self):
        model_path = os.getenv("LLM_MODEL_PATH", os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "app_data/models/gemma-3n-E4B-it-Q4_K_M.gguf"))
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Gemini 3N model not found at {model_path}. Please check LLM_MODEL_PATH.")
        self.llm = Llama(
            model_path=model_path,
            n_ctx=2048,
            n_threads=os.cpu_count(),
            verbose=False
        )
        self.max_tokens = int(os.getenv("AI_MAX_TOKENS", 2000))
        self.temperature = float(os.getenv("AI_TEMPERATURE", 0.7))

    async def generate_response(self, messages: List[Dict[str, str]], stream: bool = False, **kwargs) -> str:
        # Join messages into a single prompt string (OpenAI-style API compatibility)
        try:
            prompt = "\n".join([m["content"] for m in messages])
            output = self.llm(
                prompt,
                max_tokens=kwargs.get("max_tokens", self.max_tokens),
                temperature=kwargs.get("temperature", self.temperature)
            )
            return output["choices"][0]["text"]
        except Exception as e:
            # Log the error and re-raise with a more user-friendly message
            print(f"Error generating AI response: {str(e)}")
            raise Exception("Failed to generate AI response. Please try again later.")
    
    async def process_chat(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        stream: bool = False,
        **kwargs
    ) -> Any:
        """
        Process a chat message and return the AI's response.
        
        Args:
            user_message: The user's message.
            conversation_history: The conversation history.
            stream: Whether to stream the response.
            **kwargs: Additional parameters for the AI model.
            
        Returns:
            The AI's response or a streaming response.
        """
        # Add the user's message to the conversation history
        messages = conversation_history + [
            {"role": "user", "content": user_message}
        ]
        
        # Generate the AI's response
        response = await self.generate_response(
            messages=messages,
            stream=stream,
            **kwargs
        )
        
        if stream:
            return self._process_streaming_response(response)
        else:
            return response.choices[0].message.content
    
    async def _process_streaming_response(
        self, 
        response: Any
    ) -> AsyncGenerator[str, None]:
        """
        Process a streaming response from the AI model.
        
        Args:
            response: The streaming response from the AI model.
            
        Yields:
            Chunks of the AI's response.
        """
        async for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

# Create a singleton instance of the AI service
ai_service = AIService()
