"""
Comprehensive tests for document processing API endpoints.

These tests verify the full document processing pipeline including:
- Basic document upload and processing
- Chunking with specific chunk sizes
- Error handling for unsupported file types
- Processing of large documents with chunking
"""
import pytest
from fastapi.testclient import TestClient
from trosyn_sync.main import app

# Initialize test client
client = TestClient(app)


def test_document_processing_with_chunk_size():
    """Test document processing with chunk size parameter"""
    # Create test file
    files = {"file": ("test.txt", "test content for chunking that should be processed", "text/plain")}
    data = {"chunk_size": 500}
    
    response = client.post("/api/v1/documents", files=files, data=data)
    
    # Check status code
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    # Get response data
    response_data = response.json()
    
    # Validate top-level response structure
    expected_top_level_fields = ["id", "filename", "mime_type", "size", "chunks", "status"]
    for field in expected_top_level_fields:
        assert field in response_data, f"Missing expected field: {field}"
    
    # Validate the nested chunks structure
    chunks_data = response_data["chunks"]
    assert isinstance(chunks_data, dict), f"Expected 'chunks' to be a dict with metadata, got {type(chunks_data)}"
    
    # Check that the chunks dict contains the actual chunks list
    assert "chunks" in chunks_data, "chunks data should contain a 'chunks' field with the actual chunks"
    actual_chunks = chunks_data["chunks"]
    
    # Now validate the actual chunks
    assert isinstance(actual_chunks, list), f"Expected actual chunks to be a list, got {type(actual_chunks)}"
    assert len(actual_chunks) > 0, "Should have at least one chunk"
    
    # Validate chunk content
    for i, chunk in enumerate(actual_chunks):
        assert isinstance(chunk, str), f"Chunk {i} should be a string, got {type(chunk)}"
        assert len(chunk.strip()) > 0, f"Chunk {i} should not be empty"
    
    # Validate metadata
    assert "num_chunks" in chunks_data, "chunks data should contain num_chunks"
    assert chunks_data["num_chunks"] == len(actual_chunks), "num_chunks should match actual chunk count"
    
    # Validate other response fields
    assert response_data["status"] == "processed", f"Status should be 'processed', got {response_data['status']}"
    assert response_data["filename"] == "test.txt", "Filename should match uploaded file"
    assert response_data["mime_type"] == "text/plain", "MIME type should be text/plain"
    assert isinstance(response_data["size"], int), "Size should be an integer"
    
    print(f"✅ Test passed! Created {len(actual_chunks)} chunks from {response_data['size']} byte file")


def test_document_processing_basic():
    """Test basic document processing without chunk_size parameter"""
    files = {"file": ("simple.txt", "Simple test content", "text/plain")}
    response = client.post("/api/v1/documents", files=files)
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    
    # Validate response structure
    assert "chunks" in data, "Response missing 'chunks' field"
    assert isinstance(data["chunks"], dict), "'chunks' should be a dictionary"
    assert "chunks" in data["chunks"], "chunks data should contain a 'chunks' list"
    assert isinstance(data["chunks"]["chunks"], list), "chunks should be a list"
    assert len(data["chunks"]["chunks"]) > 0, "Should have at least one chunk"
    
    print("✅ Basic processing test passed!")


def test_unsupported_file_type():
    """Test that unsupported file types are properly rejected"""
    files = {"file": ("test.exe", b"binary content", "application/octet-stream")}
    response = client.post("/api/v1/documents", files=files)
    
    # Should return 400 for unsupported file type
    assert response.status_code == 400, f"Expected 400 for unsupported file, got {response.status_code}"
    
    # Check error message
    error_response = response.json()
    assert "detail" in error_response, "Error response should contain 'detail' field"
    assert "Unsupported file type" in error_response["detail"], \
        f"Error message should mention 'Unsupported file type', got: {error_response['detail']}"
    
    print("✅ Unsupported file type correctly rejected!")


def test_large_document_chunking():
    """Test that larger documents are properly chunked"""
    # Create a larger test document (about 2500 characters)
    large_content = "This is a test sentence. " * 100
    files = {"file": ("large.txt", large_content, "text/plain")}
    data = {"chunk_size": 500}  # Should create multiple chunks
    
    response = client.post("/api/v1/documents", files=files, data=data)
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    
    # Get the actual chunks
    actual_chunks = data["chunks"]["chunks"]
    
    # Should create multiple chunks for large content with small chunk_size
    assert len(actual_chunks) > 1, f"Expected multiple chunks for large document, got {len(actual_chunks)}"
    
    # Validate each chunk is within reasonable size (chunk_size + some overhead)
    max_expected_size = 600  # 500 + 20% overhead
    for i, chunk in enumerate(actual_chunks):
        assert len(chunk) <= max_expected_size, \
            f"Chunk {i} too large: {len(chunk)} characters (max {max_expected_size})"
    
    print(f"✅ Large document chunking test passed! Created {len(actual_chunks)} chunks")


def test_run_all_document_tests():
    """Run all document processing tests in sequence"""
    print("\n" + "="*60)
    print("RUNNING COMPREHENSIVE DOCUMENT PROCESSING TESTS")
    print("="*60)
    
    # Run each test with error handling
    tests = [
        test_document_processing_basic,
        test_document_processing_with_chunk_size,
        test_unsupported_file_type,
        test_large_document_chunking
    ]
    
    for test_func in tests:
        try:
            print(f"\nRunning {test_func.__name__}...")
            test_func()
            print(f"✅ {test_func.__name__} passed!")
        except Exception as e:
            print(f"❌ {test_func.__name__} failed: {str(e)}")
            raise
    
    print("\n" + "="*60)
    print("ALL DOCUMENT PROCESSING TESTS COMPLETED SUCCESSFULLY!")
    print("="*60)


if __name__ == "__main__":
    # Run all tests when executed directly
    test_run_all_document_tests()
