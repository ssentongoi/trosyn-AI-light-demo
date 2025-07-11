"""
Minimal test script to verify the chunking logic directly.
"""
import sys
import os
from pathlib import Path

# Add the src directory to the Python path
sys.path.append(str(Path(__file__).parent / "src"))

# Import only the chunking function we need
from trosyn_sync.ai.providers.document_processor import UnstructuredDocumentProcessor

def test_chunking():
    """Test the chunking functionality with various inputs."""
    print("\n=== Testing Document Chunking (Minimal) ===\n")
    
    # Initialize the processor
    processor = UnstructuredDocumentProcessor()
    
    # Test cases with different chunk sizes and content
    test_cases = [
        {
            "name": "Short text",
            "content": "This is a test. It contains two sentences.",
            "chunk_size": 20,
            "expected_chunks": 3
        },
        {
            "name": "Long sentence",
            "content": "This is a very long sentence that should be split into multiple chunks because it exceeds the maximum chunk size limit that we have set for this test case.",
            "chunk_size": 50,
            "expected_chunks": 4
        },
        {
            "name": "Multiple paragraphs",
            "content": "First paragraph.\n\nSecond paragraph is longer and should be split.\n\nThird paragraph.",
            "chunk_size": 40,
            "expected_chunks": 3
        },
        {
            "name": "Very small chunks",
            "content": "This tests very small chunk sizes.",
            "chunk_size": 5,
            "expected_chunks": 7
        },
        {
            "name": "Large chunk size",
            "content": "This is a test. " * 100,  # ~1500 chars
            "chunk_size": 500,
            "expected_min_chunks": 3,
            "expected_max_chunk_size": 550  # Allow 10% overage for boundary handling
        }
    ]
    
    all_passed = True
    
    for case in test_cases:
        print(f"\nTest: {case['name']}")
        print(f"Input length: {len(case['content'])} chars")
        print(f"Chunk size: {case['chunk_size']}")
        
        # Get chunks
        chunks = processor.chunk_text(case['content'], chunk_size=case['chunk_size'])
        
        # Print chunk info
        print(f"Created {len(chunks)} chunks:")
        for i, chunk in enumerate(chunks, 1):
            print(f"  Chunk {i}: {len(chunk)} chars")
        
        # Verify chunks
        if 'expected_chunks' in case:
            if len(chunks) != case['expected_chunks']:
                print(f"❌ Expected {case['expected_chunks']} chunks, got {len(chunks)}")
                all_passed = False
            else:
                print("✅ Chunk count matches")
        
        if 'expected_min_chunks' in case:
            if len(chunks) < case['expected_min_chunks']:
                print(f"❌ Expected at least {case['expected_min_chunks']} chunks, got {len(chunks)}")
                all_passed = False
            else:
                print(f"✅ Minimum chunk count ({case['expected_min_chunks']}+) met")
        
        # Verify chunk sizes
        max_chunk_size = max(len(chunk) for chunk in chunks) if chunks else 0
        max_allowed = case.get('expected_max_chunk_size', case['chunk_size'] * 1.1)  # 10% tolerance
        
        if max_chunk_size > max_allowed:
            print(f"❌ Chunk too large: {max_chunk_size} > {max_allowed}")
            all_passed = False
        else:
            print(f"✅ Max chunk size ({max_chunk_size}) within limit ({max_allowed})")
        
        # Verify no data loss
        reconstructed = "".join(chunks)
        if reconstructed != case['content']:
            print("❌ Reconstructed text doesn't match original")
            all_passed = False
        else:
            print("✅ No data loss")
    
    if all_passed:
        print("\n✅ All tests passed!")
    else:
        print("\n❌ Some tests failed")
    
    return all_passed

if __name__ == "__main__":
    test_chunking()
