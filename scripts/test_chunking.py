"""
Test script to verify document chunking functionality.
"""
import sys
import os
from pathlib import Path

# Add the src directory to the Python path
sys.path.append(str(Path(__file__).parent / "src"))

from trosyn_sync.ai.providers.document_processor import UnstructuredDocumentProcessor

def test_chunking():
    """Test the chunking functionality with sample text."""
    print("\n=== Testing Document Chunking ===\n")
    
    # Sample text with multiple sentences
    sample_text = """
    This is a test document. It contains multiple sentences to test the chunking functionality.
    The chunking algorithm should split this text into smaller chunks based on the specified size.
    Each chunk should be at most the specified size, and should try to break at sentence boundaries.
    If a sentence is too long, it should be split at a word boundary.
    """
    
    # Initialize the document processor
    processor = UnstructuredDocumentProcessor()
    
    # Test with different chunk sizes
    chunk_sizes = [50, 100, 150]
    
    for size in chunk_sizes:
        print(f"\nTesting with chunk size: {size}")
        print("-" * 40)
        
        # Chunk the text
        chunks = processor.chunk_text(sample_text, chunk_size=size)
        
        # Print the chunks
        for i, chunk in enumerate(chunks, 1):
            print(f"\nChunk {i} (length: {len(chunk)}):")
            print('"' + chunk + '"')
            
            # Verify chunk size
            assert len(chunk) <= size, f"Chunk {i} exceeds maximum size: {len(chunk)} > {size}"
    
    print("\n=== All tests passed! ===\n")

if __name__ == "__main__":
    test_chunking()
