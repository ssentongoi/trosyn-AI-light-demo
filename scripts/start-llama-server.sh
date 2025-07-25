#!/bin/bash

# Configuration
MODEL_PATH="${LLAMA_MODEL_PATH:-../shared_data/models/gemma3n/model.gguf}"
SERVER_PORT="${LLAMA_SERVER_PORT:-8080}"
CONTEXT_SIZE="${LLAMA_CONTEXT_SIZE:-2048}"
THREADS="${LLAMA_THREADS:-4}"
GPU_LAYERS="${LLAMA_GPU_LAYERS:-0}"  # Set to > 0 for GPU acceleration if available

# Check if model exists
if [ ! -f "$MODEL_PATH" ]; then
  echo "❌ Error: Model file not found at $MODEL_PATH"
  echo "Please ensure the Gemma 3N model is downloaded and the path is correct"
  exit 1
fi

# Check if llama.cpp directory exists
LLAMA_CPP_DIR="./llama.cpp"
if [ ! -d "$LLAMA_CPP_DIR" ]; then
  echo "⚠️  llama.cpp directory not found. Cloning repository..."
  git clone --depth 1 https://github.com/ggerganov/llama.cpp.git
  if [ $? -ne 0 ]; then
    echo "❌ Failed to clone llama.cpp repository"
    exit 1
  fi
  
  echo "🔨 Building llama.cpp with CMake..."
  cd llama.cpp
  mkdir -p build
  cd build
  cmake .. -DLLAMA_METAL=ON -DCMAKE_BUILD_TYPE=Release
  cmake --build . --config Release -j
  if [ $? -ne 0 ]; then
    echo "❌ Failed to build llama.cpp"
    exit 1
  fi
  cd ../..
fi

echo "🚀 Starting llama.cpp server with the following configuration:"
echo "   Model: $MODEL_PATH"
echo "   Port: $SERVER_PORT"
echo "   Context Size: $CONTEXT_SIZE"
echo "   Threads: $THREADS"
echo "   GPU Layers: $GPU_LAYERS"

# Start the server
cd $LLAMA_CPP_DIR/build
./bin/server \
  -m "../$MODEL_PATH" \
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
