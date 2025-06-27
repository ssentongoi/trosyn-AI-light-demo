#!/bin/bash
# Setup script for LLM integration environment
# Usage: ./scripts/setup_llm_env.sh

set -e  # Exit on error

# Check if running on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Detected macOS system"
    # Install Homebrew if not installed
    if ! command -v brew &> /dev/null; then
        echo "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    # Install system dependencies
    echo "Installing system dependencies..."
    brew update
    brew install cmake python@3.10 git rust
    
    # For Unstructured
    brew install libmagic
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Check if running on Ubuntu/Debian
    if [ -f /etc/debian_version ]; then
        echo "Detected Debian/Ubuntu system"
        sudo apt update
        sudo apt install -y \
            python3.10 \
            python3.10-venv \
            python3-pip \
            cmake \
            build-essential \
            git \
            libmagic-dev \
            cargo
    else
        echo "Unsupported Linux distribution. Please install dependencies manually."
        exit 1
    fi
else
    echo "Unsupported operating system. Please install dependencies manually."
    exit 1
fi

# Create and activate virtual environment
echo "Creating Python virtual environment..."
python3.10 -m venv venv
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r llm-requirements.txt

# Install Unstructured dependencies
echo "Installing Unstructured dependencies..."
pip install "unstructured[all-docs]"

# Install llama-cpp-python with proper build flags
echo "Installing llama-cpp-python..."
if [[ "$(uname -m)" == "arm64" ]]; then
    # For M1/M2 Macs
    CMAKE_ARGS="-DLLAMA_METAL=on" pip install llama-cpp-python --no-cache-dir
else
    pip install llama-cpp-python --no-cache-dir
fi

echo ""
echo "Environment setup complete!"
echo "To activate the virtual environment, run:"
echo "source venv/bin/activate"
echo ""
echo "Next steps:"
echo "1. Download the Gemini 3.1B GGUF model"
echo "2. Configure your .env file with model paths"
echo "3. Run tests to verify the installation"
