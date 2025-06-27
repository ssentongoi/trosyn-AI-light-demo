#!/usr/bin/env python3
"""
Test script to verify the Gemini 3.1B model is working correctly.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_model_loading():
    """Test if the model can be loaded successfully."""
    try:
        from llama_cpp import Llama
        
        model_path = os.getenv("LLM_MODEL_PATH", "models/gemini-3.1b.Q4_K_M.gguf")
        
        if not os.path.exists(model_path):
            print(f"Error: Model file not found at {model_path}")
            print("Please run 'scripts/setup_model.sh' first.")
            return False
        
        print(f"Loading model from {model_path}...")
        
        # Initialize the model with basic settings
        llm = Llama(
            model_path=model_path,
            n_ctx=2048,  # Context window
            n_threads=os.cpu_count(),  # Use all available CPU cores
            verbose=False
        )
        
        # Test a simple completion
        print("\nTesting model with a simple prompt...")
        prompt = "Hello, my name is"
        print(f"Prompt: {prompt}")
        
        output = llm(
            prompt,
            max_tokens=32,
            stop=["\n"],
            echo=True
        )
        
        print("\nModel output:")
        print(output['choices'][0]['text'])
        
        return True
        
    except ImportError as e:
        print(f"Error: {e}")
        print("Please install the required packages with 'pip install -r llm-requirements.txt'")
        return False
    except Exception as e:
        print(f"Error loading model: {e}")
        return False

if __name__ == "__main__":
    print("=== Gemini 3.1B Model Test ===\n")
    
    if test_model_loading():
        print("\n✅ Model loaded successfully!")
        sys.exit(0)
    else:
        print("\n❌ Model test failed.")
        sys.exit(1)
