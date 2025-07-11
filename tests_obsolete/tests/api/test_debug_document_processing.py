"""
Debug utilities for testing the document processing API.

This module contains test functions specifically designed to help debug and understand
the document processing API's behavior, especially around chunking and response formats.
"""
import json
import pytest
from fastapi.testclient import TestClient

# Import the FastAPI app
from trosyn_sync.main import app  # Update this import based on your project structure


def test_debug_document_processing_response():
    """
    Comprehensive debug test to understand the exact API response structure.
    Run this first to see what your API is actually returning.
    """
    client = TestClient(app)
    
    print("\n" + "="*60)
    print("DEBUGGING DOCUMENT PROCESSING API RESPONSE")
    print("="*60)
    
    # Test 1: Basic document processing without chunk_size
    print("\n1. Testing basic document processing (no chunk_size):")
    files = {"file": ("test.txt", "This is test content for document processing", "text/plain")}
    
    response = client.post("/api/v1/documents", files=files)
    print(f"   Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"   Response Type: {type(data)}")
        print(f"   Response Keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
        print("   Full Response:")
        print(json.dumps(data, indent=4, default=str))
        
        # Analyze chunks specifically
        if "chunks" in data:
            chunks = data["chunks"]
            print(f"\n   CHUNKS ANALYSIS:")
            print(f"   - Type of 'chunks': {type(chunks)}")
            print(f"   - Value of 'chunks': {chunks}")
            
            if isinstance(chunks, list):
                print(f"   - Number of chunks: {len(chunks)}")
                print(f"   - First chunk preview: {chunks[0][:50] if chunks else 'No chunks'}...")
            elif isinstance(chunks, dict):
                print(f"   - Dict keys: {list(chunks.keys())}")
                print(f"   - Dict values preview: {str(chunks)[:200]}...")
    else:
        print(f"   Error Response: {response.text}")
    
    # Test 2: Document processing WITH chunk_size
    print("\n2. Testing document processing WITH chunk_size=500:")
    files = {"file": ("test2.txt", 
                      "This is longer test content for document processing that should be chunked into smaller pieces based on the chunk size parameter", 
                      "text/plain")}
    data = {"chunk_size": 500}
    
    response = client.post("/api/v1/documents", files=files, data=data)
    print(f"   Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("   Response with chunk_size:")
        print(json.dumps(data, indent=4, default=str))
        
        # Compare chunks structure
        if "chunks" in data:
            chunks = data["chunks"]
            print("\n   CHUNKS WITH CHUNK_SIZE ANALYSIS:")
            print(f"   - Type: {type(chunks)}")
            print(f"   - Structure: {str(chunks)[:200]}...")
    else:
        print(f"   Error Response: {response.text}")
    
    # Test 3: Error case (to see error response format)
    print("\n3. Testing error case (unsupported file type):")
    files = {"file": ("test.exe", b"binary content", "application/octet-stream")}
    
    response = client.post("/api/v1/documents", files=files)
    print(f"   Status Code: {response.status_code}")
    print(f"   Error Response: {response.text}")
    
    print("\n" + "="*60)
    print("DEBUG COMPLETE - Check the output above!")
    print("="*60)
    
    # This test always passes - it's just for debugging
    assert True


def test_current_failing_test_detailed():
    """
    Run the exact test that's failing with more detailed output.
    Useful for debugging specific test failures.
    """
    client = TestClient(app)
    
    print("\n" + "="*50)
    print("REPRODUCING THE FAILING TEST")
    print("="*50)
    
    files = {"file": ("test.txt", "test content for chunking", "text/plain")}
    data = {"chunk_size": 500}
    
    response = client.post("/api/v1/documents", files=files, data=data)
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        response_data = response.json()
        print(f"Full response: {json.dumps(response_data, indent=2)}")
        
        if "chunks" in response_data:
            chunks = response_data["chunks"]
            print("\nChunks analysis:")
            print(f"- Type: {type(chunks)}")
            print(f"- isinstance(chunks, list): {isinstance(chunks, list)}")
            print(f"- isinstance(chunks, dict): {isinstance(chunks, dict)}")
            print(f"- Value: {chunks}")
            
            # This is the line that's failing in your original test
            try:
                assert isinstance(chunks, list), f"'chunks' should be a list, but got {type(chunks)}"
                print("✅ Assertion PASSED: chunks is a list")
            except AssertionError as e:
                print(f"❌ Assertion FAILED: {e}")
                print(f"   Actual chunks value: {chunks}")
                print(f"   Actual chunks type: {type(chunks)}")
    else:
        print(f"Request failed: {response.text}")
    
    print("="*50)
    
    # This test always passes - it's just for debugging
    assert True


if __name__ == "__main__":
    # You can run this directly to debug
    test_debug_document_processing_response()
    test_current_failing_test_detailed()
