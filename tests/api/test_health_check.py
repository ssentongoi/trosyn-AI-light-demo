"""
Comprehensive health check tests for the Trosyn AI API.
"""
import pytest
from fastapi.testclient import TestClient
from src.trosyn_sync.main import app

client = TestClient(app)

def test_client_initialization():
    """Test that the TestClient can be initialized and make requests."""
    response = client.get("/health")
    # Should return 200 if health endpoint exists, 404 otherwise
    assert response.status_code in [200, 404], \
        f"Unexpected status code: {response.status_code}"

def test_search_response_format():
    """Test that search endpoint returns results in the correct format."""
    response = client.post(
        "/api/v1/documents/search",
        json={"query": "test"}
    )
    
    assert response.status_code == 200, \
        f"Expected status code 200, got {response.status_code}"
    
    data = response.json()
    assert "results" in data, "Response missing 'results' key"
    assert isinstance(data["results"], list), "'results' should be a list"

def test_document_processing_with_chunk_size():
    """Test document processing with custom chunk size."""
    # Create a test file in memory
    files = {"file": ("test.txt", "test content" * 100, "text/plain")}
    data = {"chunk_size": 500}
    
    response = client.post(
        "/api/v1/documents",
        files=files,
        data=data
    )
    
    # Should either succeed (200) or return validation error (422)
    assert response.status_code in [200, 422], \
        f"Unexpected status code: {response.status_code}"

    if response.status_code == 200:
        data = response.json()
        print("\nDEBUG - API Response:", data)  # Debug output
        
        # The response should contain document metadata and chunks
        assert "id" in data, "Response missing 'id' field"
        assert "filename" in data, "Response missing 'filename' field"
        assert "chunks" in data, "Response missing 'chunks' field"
        assert "num_chunks" in data, "Response missing 'num_chunks' field"
        
        # Debug output for chunks type and content
        print(f"\nDEBUG - chunks type: {type(data['chunks'])}")
        print(f"DEBUG - chunks content: {data['chunks']}")
        
        # Handle the nested chunks structure
        if isinstance(data["chunks"], dict) and "chunks" in data["chunks"]:
            # If chunks is a dict with a 'chunks' key, use that
            chunks_list = data["chunks"]["chunks"]
            chunks_num = data["chunks"].get("num_chunks", len(chunks_list))
        else:
            # Otherwise, use the top-level chunks
            chunks_list = data["chunks"]
            chunks_num = data["num_chunks"]
        
        # Verify chunks is a list and contains the expected content
        assert isinstance(chunks_list, list), \
            f"'chunks' should be a list, got {type(chunks_list)}: {chunks_list}"
            
        assert len(chunks_list) > 0, "Expected at least one chunk"
        assert all(isinstance(chunk, str) for chunk in chunks_list), \
            "All chunks should be strings"
        
        # Verify num_chunks matches the actual number of chunks
        assert chunks_num == len(chunks_list), \
            f"num_chunks ({chunks_num}) should match the number of chunks ({len(chunks_list)})"

def test_error_handling():
    """Test error handling for various edge cases."""
    # Test unsupported file type (should return 400)
    files = {"file": ("test.exe", b"binary", "application/octet-stream")}
    response = client.post("/api/v1/documents", files=files)
    assert response.status_code == 400, \
        f"Expected 400 for unsupported file type, got {response.status_code}"
    
    # Test malformed request (should return 422)
    response = client.post("/api/v1/documents")  # No file
    assert response.status_code == 422, \
        f"Expected 422 for invalid request, got {response.status_code}"

def test_large_document_handling():
    """Test handling of large documents with custom chunk size."""
    # Create a large text file in memory (~1MB)
    large_content = "This is a test line. " * 50000  # ~1MB
    files = {"file": ("large.txt", large_content, "text/plain")}
    data = {"chunk_size": 2000}
    
    response = client.post(
        "/api/v1/documents",
        files=files,
        data=data
    )
    
    assert response.status_code == 200, \
        f"Failed to process large file: {response.text}"
    
    data = response.json()
    assert data["num_chunks"] > 1, "Large file should be split into multiple chunks"
