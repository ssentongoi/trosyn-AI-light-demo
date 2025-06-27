#!/usr/bin/env python3
"""
Test script for Gemma 3.1B model integration.
"""

import os
import time
from pathlib import Path
from dotenv import load_dotenv
from llama_cpp import Llama

# Load environment variables
load_dotenv()

def load_model():
    """Load the Gemma 3.1B model."""
    model_path = os.getenv("LLM_MODEL_PATH", "models/gemma-3-1b-it-q4_0.gguf")
    context_size = int(os.getenv("LLM_CONTEXT_SIZE", 2048))
    n_gpu_layers = int(os.getenv("LLM_N_GPU_LAYERS", 0))
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found at {model_path}")
    
    print(f"Loading model: {model_path}")
    print(f"Context size: {context_size}")
    print(f"GPU layers: {n_gpu_layers}")
    
    start_time = time.time()
    llm = Llama(
        model_path=model_path,
        n_ctx=context_size,
        n_gpu_layers=n_gpu_layers,
        n_threads=os.cpu_count(),
        verbose=True
    )
    load_time = time.time() - start_time
    print(f"Model loaded in {load_time:.2f} seconds")
    
    return llm

def format_prompt(prompt, system_prompt=None):
    """Format the prompt for Gemma's chat template with optional system message."""
    if system_prompt:
        return (
            f"<start_of_turn>system\n{system_prompt}<end_of_turn>\n"
            f"<start_of_turn>user\n{prompt}<end_of_turn>\n"
            "<start_of_turn>model\n"
        )
    return f"<start_of_turn>user\n{prompt}<end_of_turn>\n<start_of_turn>model\n"

def test_generation(
    llm, 
    prompt, 
    max_tokens=512, 
    temperature=0.7, 
    top_p=0.9,
    system_prompt=None,
    show_prompt=True
):
    """Test text generation with the model.
    
    Args:
        llm: Initialized Llama model instance
        prompt (str): The input prompt
        max_tokens (int): Maximum number of tokens to generate
        temperature (float): Sampling temperature
        top_p (float): Nucleus sampling parameter
        system_prompt (str, optional): System prompt for chat context
        show_prompt (bool): Whether to print the prompt
    """
    print("\n" + "="*80)
    if show_prompt:
        print(f"PROMPT: {prompt}")
        if system_prompt:
            print(f"SYSTEM: {system_prompt}")
        print("-"*80)
    
    # Format the prompt for Gemma
    formatted_prompt = format_prompt(prompt, system_prompt)
    
    start_time = time.time()
    try:
        output = llm.create_completion(
            formatted_prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            echo=False,
            stop=["<end_of_turn>", "<eos>", "\nUser:", "\n###"],
            stream=False
        )
        
        generation_time = time.time() - start_time
        
        # Handle the output format from llama-cpp-python
        if isinstance(output, dict) and 'choices' in output and len(output['choices']) > 0:
            response = output['choices'][0]['text'].strip()
            # Get token count from usage if available, otherwise estimate from text
            if 'usage' in output and 'completion_tokens' in output['usage']:
                tokens_generated = output['usage']['completion_tokens']
            else:
                # Fallback: estimate tokens as ~4 chars per token
                tokens_generated = len(response) // 4
        else:
            response = str(output)
            tokens_generated = 0
        
        # Calculate tokens per second
        tokens_per_second = tokens_generated / generation_time if generation_time > 0 else 0
        
        # Print the response with word wrap
        print("RESPONSE:")
        import textwrap
        for line in textwrap.wrap(response, width=100):
            print(f"  {line}")
        
        print("-"*80)
        print(f"Generated {tokens_generated} tokens in {generation_time:.2f} seconds ({tokens_per_second:.1f} tokens/sec)")
        
        # Print model info if available
        if 'model' in output:
            print(f"Model: {output['model']}")
        
        return response
        
    except Exception as e:
        print(f"Error during generation: {str(e)}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        print("="*80 + "\n")

def get_test_prompts():
    """Return a list of test prompts with their configurations."""
    return [
        {
            "prompt": "Tell me about artificial intelligence in detail.",
            "max_tokens": 512,
            "temperature": 0.7,
            "system_prompt": "You are a helpful AI assistant that provides detailed and accurate information."
        },
        {
            "prompt": (
                "Explain the main benefits of using Rust for systems programming. "
                "Compare it to C++ and Go in terms of memory safety and performance."
            ),
            "max_tokens": 768,
            "temperature": 0.8,
            "system_prompt": "You are a senior software engineer with expertise in systems programming."
        },
        {
            "prompt": (
                "Write a thoughtful poem about the relationship between technology and nature. "
                "The poem should be at least 4 stanzas long and explore both the harmony "
                "and tension between these two forces."
            ),
            "max_tokens": 1024,
            "temperature": 0.9,
            "system_prompt": "You are a poet with a deep appreciation for both technology and the natural world."
        },
        {
            "prompt": (
                "Explain how large language models work in simple terms that a high school student "
                "could understand. Include the concepts of training data, neural networks, "
                "and how the model generates text."
            ),
            "max_tokens": 896,
            "temperature": 0.6,
            "system_prompt": "You are a patient teacher who explains complex technical topics in simple, clear language."
        }
    ]

def main():
    """Main function to test the Gemma 3.1B model."""
    print("="*80)
    print("Gemma 3.1B Model Test".center(80))
    print("="*80)
    
    try:
        # Load the model
        print("Loading model...")
        llm = load_model()
        
        # Run test prompts
        test_prompts = get_test_prompts()
        
        for i, test in enumerate(test_prompts, 1):
            print(f"\nTest {i}/{len(test_prompts)}")
            test_generation(
                llm=llm,
                prompt=test["prompt"],
                max_tokens=test["max_tokens"],
                temperature=test["temperature"],
                system_prompt=test.get("system_prompt"),
                show_prompt=True
            )
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
