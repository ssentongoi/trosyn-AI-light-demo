#!/bin/bash

# Configuration
MODEL_PATH="${LLAMA_MODEL_PATH:-../shared_data/models/gemma3n/model.gguf}"
SERVER_PORT="${LLAMA_SERVER_PORT:-8080}"
CONTEXT_SIZE="${LLAMA_CONTEXT_SIZE:-2048}"
THREADS="${LLAMA_THREADS:-4}"
GPU_LAYERS="${LLAMA_GPU_LAYERS:-0}"  # Set to > 0 for GPU acceleration if available

# Check if model exists in any of the possible locations
POSSIBLE_PATHS=(
  "$MODEL_PATH"
  "$(pwd)/shared_data/models/gemma3n/model.gguf"
  "$(pwd)/backend/models/gemma3n/model.gguf"
  "../shared_data/models/gemma3n/model.gguf"
  "../backend/models/gemma3n/model.gguf"
)

FOUND_MODEL=""
for path in "${POSSIBLE_PATHS[@]}"; do
  if [ -f "$path" ]; then
    FOUND_MODEL="$path"
    break
  fi
done

if [ -z "$FOUND_MODEL" ]; then
  echo "❌ Error: Could not find model file in any of these locations:"
  printf '  - %s\n' "${POSSIBLE_PATHS[@]}"
  echo "Please ensure the Gemma 3N model is downloaded and the path is correct"
  exit 1
else
  # Convert to absolute path to handle cd later in the script
  MODEL_PATH="$(cd "$(dirname "$FOUND_MODEL")" && pwd)/$(basename "$FOUND_MODEL")"
  echo "✅ Found model at: $MODEL_PATH"
fi

# Set absolute path to llama.cpp directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LLAMA_CPP_DIR="$SCRIPT_DIR/../backend/llama.cpp"

# Check if llama.cpp directory exists
if [ ! -d "$LLAMA_CPP_DIR" ]; then
  echo "❌ Error: llama.cpp directory not found at $LLAMA_CPP_DIR"
  echo "Please ensure llama.cpp is cloned and built in the backend directory"
  exit 1
fi

# Set path to server binary
if [ -f "$LLAMA_CPP_DIR/build/bin/llama-server" ]; then
  SERVER_BIN="$LLAMA_CPP_DIR/build/bin/llama-server"
elif [ -f "$LLAMA_CPP_DIR/build/llama-server" ]; then
  SERVER_BIN="$LLAMA_CPP_DIR/build/llama-server"
else
  echo "❌ Error: Could not find llama-server binary in $LLAMA_CPP_DIR/build/"
  echo "Please ensure llama.cpp is built with the server target"
  exit 1
fi

echo "✅ Found llama-server at: $SERVER_BIN"

echo "🚀 Starting llama.cpp server with the following configuration:"
echo "   Model: $MODEL_PATH"
echo "   Port: $SERVER_PORT"
echo "   Context Size: $CONTEXT_SIZE"
echo "   Threads: $THREADS"
echo "   GPU Layers: $GPU_LAYERS"

# Start the server
cd $LLAMA_CPP_DIR/build
$SERVER_BIN \
  -m "$MODEL_PATH" \
  --port "$SERVER_PORT" \
  --ctx-size "$CONTEXT_SIZE" \
  --threads "$THREADS" \
  --n-gpu-layers "$GPU_LAYERS" \
  --log-disable

# Check if server started successfully
if [ $? -ne 0 ]; then
  echo "❌ Failed to start llama.cpp server"
  exit 1
fi
