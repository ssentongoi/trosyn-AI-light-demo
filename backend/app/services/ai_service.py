import os
from typing import List, Dict, Any, Optional, AsyncGenerator
from openai import OpenAI, AsyncOpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class AIService:
    """Service class for handling AI-related operations."""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = os.getenv("AI_MODEL", "gpt-4o")
        self.max_tokens = int(os.getenv("AI_MAX_TOKENS", 2000))
        self.temperature = float(os.getenv("AI_TEMPERATURE", 0.7))
    
    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        stream: bool = False,
        **kwargs
    ) -> Any:
        """
        Generate a response from the AI model.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'.
            stream: Whether to stream the response.
            **kwargs: Additional parameters for the AI model.
            
        Returns:
            The AI's response or a streaming response.
        """
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=kwargs.get('max_tokens', self.max_tokens),
                temperature=kwargs.get('temperature', self.temperature),
                stream=stream,
            )
            return response
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
