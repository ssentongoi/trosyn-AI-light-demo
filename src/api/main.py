from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Union
import os
import time
import logging
import shutil
import uuid
from pathlib import Path
from datetime import datetime

# Import routers
from .routers import documents

# Import models
from .models.document import DocumentProcessResponse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Trosyn AI API",
    description="API for Trosyn AI's Gemma 3N LLM and Document Processing",
    version="0.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Include routers
app.include_router(documents.router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class CompletionRequest(BaseModel):
    prompt: str
    max_tokens: int = 512
    temperature: float = 0.7
    top_p: float = 0.9
    stop: Optional[List[str]] = None

class ChatMessage(BaseModel):
    role: str  # 'system', 'user', or 'assistant'
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    max_tokens: int = 512
    temperature: float = 0.7
    top_p: float = 0.9
    stop: Optional[List[str]] = None

class ModelInfo(BaseModel):
    id: str
    object: str = "model"
    created: int
    owned_by: str = "trosyn-ai"

# Initialize LLM
llm = None
model_loaded = False
model_info = {
    "id": "google/gemma-3n-e2b",
    "created": int(time.time()),
    "object": "model",
    "owned_by": "trosyn-ai"
}

@app.on_event("startup")
async def startup_event():
    """Initialize the LLM on startup."""
    global llm, model_loaded
    try:
        from llama_cpp import Llama
        
        model_path = os.getenv("LLM_MODEL_PATH", "models/gemma-3n-e2b.gguf")
        if not os.path.exists(model_path):
            logger.error(f"Model file not found at {model_path}")
            return
            
        logger.info(f"Loading model from {model_path}...")
        llm = Llama(
            model_path=model_path,
            n_ctx=int(os.getenv("LLM_CONTEXT_SIZE", 2048)),
            n_gpu_layers=int(os.getenv("LLM_N_GPU_LAYERS", 0)),
            n_threads=os.cpu_count(),
            verbose=True
        )
        model_loaded = True
        logger.info("Model loaded successfully")
        
    except Exception as e:
        logger.error(f"Failed to load model: {str(e)}")
        raise

@app.get("/v1/models")
async def list_models():
    """List available models."""
    return {"data": [model_info]}

@app.post("/v1/completions")
async def create_completion(request: CompletionRequest):
    """Generate text completion."""
    if not model_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Format the prompt
        prompt = f"<start_of_turn>user\n{request.prompt}<end_of_turn>\n<start_of_turn>model\n"
        
        # Generate completion
        response = llm.create_completion(
            prompt=prompt,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            top_p=request.top_p,
            stop=request.stop or ["<end_of_turn>", "<eos>", "\n"],
            echo=False
        )
        
        return {
            "id": f"cmpl-{int(time.time())}",
            "object": "text_completion",
            "created": int(time.time()),
            "model": model_info["id"],
            "choices": [{
                "text": response['choices'][0]['text'].strip(),
                "index": 0,
                "logprobs": None,
                "finish_reason": "length" if len(response['choices'][0]['text'].split()) >= request.max_tokens else "stop"
            }],
            "usage": {
                "prompt_tokens": response['usage']['prompt_tokens'],
                "completion_tokens": response['usage']['completion_tokens'],
                "total_tokens": response['usage']['total_tokens']
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating completion: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/chat/completions")
async def create_chat_completion(request: ChatRequest):
    """Generate chat completion."""
    if not model_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Format messages for Gemma
        formatted_messages = []
        for msg in request.messages:
            role = "model" if msg.role == "assistant" else msg.role
            formatted_messages.append(f"<start_of_turn>{role}\n{msg.content}<end_of_turn>")
        
        # Add the model's turn
        formatted_messages.append("<start_of_turn>model\n")
        prompt = "\n".join(formatted_messages)
        
        # Generate completion
        response = llm.create_completion(
            prompt=prompt,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            top_p=request.top_p,
            stop=request.stop or ["<end_of_turn>", "<eos>", "\n"],
            echo=False
        )
        
        return {
            "id": f"chatcmpl-{int(time.time())}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": model_info["id"],
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": response['choices'][0]['text'].strip()
                },
                "finish_reason": "length" if len(response['choices'][0]['text'].split()) >= request.max_tokens else "stop"
            }],
            "usage": {
                "prompt_tokens": response['usage']['prompt_tokens'],
                "completion_tokens": response['usage']['completion_tokens'],
                "total_tokens": response['usage']['total_tokens']
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating chat completion: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health", tags=["health"])
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint.
    
    Returns:
        Dict containing API health status and model information
    """
    return {
        "status": "ok" if model_loaded else "error",
        "model_loaded": model_loaded,
        "model": model_info if model_loaded else None,
        "timestamp": datetime.utcnow().isoformat(),
        "version": "0.2.0"
    }

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Add a simple file upload endpoint for testing
@app.post("/v1/upload", tags=["utilities"])
async def upload_file(file: UploadFile = File(...)):
    """
    Simple file upload endpoint for testing.
    
    Args:
        file: The file to upload
        
    Returns:
        Dict containing file information
    """
    try:
        # Create a unique filename
        file_ext = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Save the file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        return {
            "filename": file.filename,
            "saved_as": unique_filename,
            "content_type": file.content_type,
            "size": file_path.stat().st_size,
            "saved_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {str(e)}"
        )
    finally:
        await file.close()
