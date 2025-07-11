"""
Debug tests for document chunking behavior.
"""
import pytest
from fastapi.testclient import TestClient
from trosyn_sync.main import app

# Initialize test client
client = TestClient(app)

def test_debug_chunking_behavior():
    """
    Debug test to understand exactly how your chunking is working
    """
    print("\n" + "="*60)
    print("DEBUGGING CHUNKING BEHAVIOR")
    print("="*60)
    
    # Test with different chunk sizes to see the pattern
    test_cases = [
        {"chunk_size": 100, "content": "Short content for testing. " * 10},
        {"chunk_size": 300, "content": "Medium length content for testing chunking behavior. " * 15},
        {"chunk_size": 500, "content": "This is a longer test content. " * 50},
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. Testing with chunk_size={test_case['chunk_size']}")
        print(f"   Input length: {len(test_case['content'])} characters")
        
        files = {"file": (f"test{i}.txt", test_case['content'], "text/plain")}
        data = {"chunk_size": test_case['chunk_size']}
        
        response = client.post("/api/v1/documents", files=files, data=data)
        
        if response.status_code == 200:
            response_data = response.json()
            chunks = response_data["chunks"]["chunks"]
            
            print(f"   Created {len(chunks)} chunks:")
            
            for j, chunk in enumerate(chunks):
                chunk_len = len(chunk)
                exceeds_limit = chunk_len > test_case['chunk_size'] + 100
                status = "❌ EXCEEDS" if exceeds_limit else "✅ OK"
                
                print(f"     Chunk {j}: {chunk_len} chars {status}")
                if exceeds_limit:
                    print(f"       Expected max: ~{test_case['chunk_size']}")
                    print(f"       Actual: {chunk_len}")
                    print(f"       Preview: {chunk[:100]}...")
        else:
            print(f"   ❌ Request failed: {response.status_code}")
    
    print("="*60)


def test_large_document_chunking_fixed():
    """
    Updated test with better debugging and more reasonable expectations
    """
    # Create a larger test document
    large_content = "This is a test sentence for chunking. " * 100  # ~3800 characters
    requested_chunk_size = 500
    
    # For multipart/form-data with FastAPI test client, both files and form fields need
    # to be in the files dict when using Form parameters
    files = {
        "file": ("large.txt", large_content, "text/plain"),
        # Send as both regular and form parameter to cover both cases
        "chunk_size": (None, str(requested_chunk_size)),
        "chunk_size_form": (None, str(requested_chunk_size))
    }
    # Also include as data to support query parameter mode
    data = {"chunk_size": requested_chunk_size}
    
    print(f"\nTesting large document chunking:")
    print(f"Input length: {len(large_content)} characters")
    print(f"Requested chunk size: {requested_chunk_size}")
    
    response = client.post("/api/v1/documents", files=files, data=data)
    
    assert response.status_code == 200, f"Request failed: {response.status_code}"
    
    response_data = response.json()
    chunks_data = response_data["chunks"]
    actual_chunks = chunks_data["chunks"]
    
    print(f"Created {len(actual_chunks)} chunks")
    
    # More reasonable expectations with debugging
    tolerance = 200  # Allow 200 character tolerance for boundary handling
    max_expected_size = requested_chunk_size + tolerance
    
    oversized_chunks = []
    
    for i, chunk in enumerate(actual_chunks):
        chunk_len = len(chunk)
        print(f"Chunk {i}: {chunk_len} characters")
        
        if chunk_len > max_expected_size:
            oversized_chunks.append({
                'index': i,
                'size': chunk_len,
                'content_preview': chunk[:100] + "..."
            })
    
    if oversized_chunks:
        print(f"\n❌ Found {len(oversized_chunks)} oversized chunks:")
        for chunk_info in oversized_chunks:
            print(f"  Chunk {chunk_info['index']}: {chunk_info['size']} chars")
            print(f"    Preview: {chunk_info['content_preview']}")
        
        # Instead of failing immediately, let's understand why
        print(f"\nExpected max size: {max_expected_size}")
        print(f"Largest chunk: {max(len(c) for c in actual_chunks)} chars")
        
        # This assertion will help you see exactly what's wrong
        largest_chunk_size = max(len(c) for c in actual_chunks)
        assert largest_chunk_size <= max_expected_size, \
            f"Chunk size {largest_chunk_size} exceeds limit {max_expected_size}. " \
            f"This suggests the chunking algorithm needs to be fixed."
    
    # Basic validations
    assert len(actual_chunks) > 1, f"Expected multiple chunks for large document, got {len(actual_chunks)}"
    
    # Validate all chunks have content
    for i, chunk in enumerate(actual_chunks):
        assert len(chunk.strip()) > 0, f"Chunk {i} is empty"
    
    print(f"✅ Large document chunking test completed")


def test_chunking_algorithm_directly():
    """
    Test the chunking algorithm outside of the API to isolate the issue
    """
    print("\n" + "="*50)
    print("TESTING CHUNKING ALGORITHM DIRECTLY")
    print("="*50)
    
    # Test content
    test_content = "This is a test sentence for direct chunking. " * 50  # ~2250 chars
    chunk_size = 500
    
    print(f"Input length: {len(test_content)}")
    print(f"Target chunk size: {chunk_size}")
    
    # Get the chunking function from the processor
    from trosyn_sync.ai.providers.document_processor import UnstructuredDocumentProcessor
    processor = UnstructuredDocumentProcessor()
    
    # Test the chunking directly
    chunks = processor.chunk_text(test_content, chunk_size=chunk_size)
    
    print(f"\nCreated {len(chunks)} chunks:")
    for i, chunk in enumerate(chunks):
        print(f"Chunk {i}: {len(chunk)} characters")
        print(f"  Preview: {chunk[:100]}...")
    
    # Verify chunk sizes
    max_chunk_size = max(len(chunk) for chunk in chunks)
    print(f"\nMax chunk size: {max_chunk_size} (target: {chunk_size})")
    
    # Allow 10% tolerance for chunk size
    assert max_chunk_size <= chunk_size * 1.1, f"Chunk size {max_chunk_size} exceeds {chunk_size * 1.1}"
    
    # Verify all text is preserved
    reconstructed = "".join(chunks)
    assert reconstructed == test_content, "Reconstructed text doesn't match original"
    
    print("✅ Chunking algorithm test completed")
    print("="*50)
    
    return chunks

if __name__ == "__main__":
    # Run tests directly for debugging
    test_chunking_algorithm_directly()
    test_debug_chunking_behavior()
    test_large_document_chunking_fixed()
