#!/usr/bin/env python3
"""
Test script for the DocumentProcessor class.
"""
import os
import sys
import json
from pathlib import Path

# Add the project root to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.api.document_processor import DocumentProcessor

def test_document_processor():
    """Test the DocumentProcessor with a sample document."""
    print("Testing DocumentProcessor...")
    
    # Initialize the processor
    processor = DocumentProcessor(output_dir="test_output")
    
    # Test file path
    test_file = Path("tests/test_document.txt")
    if not test_file.exists():
        print(f"Error: Test file not found at {test_file}")
        return False
    
    print(f"Processing test document: {test_file}")
    
    try:
        # Process the document
        chunks = processor.process_document(str(test_file))
        
        # Print results
        print(f"\nDocument processed successfully!")
        print(f"Number of chunks: {len(chunks)}")
        
        # Print each chunk
        for i, chunk in enumerate(chunks, 1):
            print(f"\n--- Chunk {i} ---")
            print(f"Type: {chunk['type']}")
            if 'section' in chunk:
                print(f"Section: {chunk['section']}")
            print(f"Text: {chunk['text'][:200]}..." if len(chunk['text']) > 200 else f"Text: {chunk['text']}")
        
        # Save chunks to JSON
        output_file = "test_output/processed_document.json"
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        processor.save_chunks_to_json(chunks, output_file)
        print(f"\nChunks saved to {output_file}")
        
        return True
        
    except Exception as e:
        print(f"Error processing document: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_document_processor()
