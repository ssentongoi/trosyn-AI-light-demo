#!/bin/bash

# Activate virtual environment
source venv/bin/activate

# Set environment variables
export LLM_MODEL_PATH="models/gemma-3-1b-it-q4_0.gguf"
export LLM_CONTEXT_SIZE=2048
export LLM_N_GPU_LAYERS=0

# Run the FastAPI server
uvicorn src.api.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --reload \
    --log-level info
