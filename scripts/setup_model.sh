#!/bin/bash
# Setup script for downloading and verifying the Gemini 3.1B model

set -e  # Exit on error

# Create necessary directories
echo "Creating directory structure..."
mkdir -p models data/documents data/processed logs

# Activate virtual environment if it exists
if [ -f "venv/bin/activate" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

# Install required Python packages
echo "Installing required packages..."
pip install requests tqdm

# Run the download script
echo "Starting model download..."
python3 scripts/download_model.py

# Update .env with model path if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file from example..."
    cp .env.example .env
    
    # Update model path in .env
    echo "Updating model path in .env..."
    sed -i '' 's|^LLM_MODEL_PATH=.*|LLM_MODEL_PATH=models/gemini-3.1b.Q4_K_M.gguf|' .env
    
    echo "\nPlease review the .env file and update any other settings as needed."
else
    echo "\nPlease ensure LLM_MODEL_PATH in .env is set to: models/gemini-3.1b.Q4_K_M.gguf"
fi

echo "\nSetup complete! Next steps:"
echo "1. Review the .env file configuration"
echo "2. Run 'source venv/bin/activate' to activate the virtual environment"
echo "3. Test the model with 'python3 scripts/test_model.py'"
