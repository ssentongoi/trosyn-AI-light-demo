#!/usr/bin/env python3
"""
Test script for the Document Processing API endpoints.
"""
import os
import sys
import json
import requests
from pathlib import Path
from typing import Dict, Any

# Add the project root to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

# API configuration
BASE_URL = "http://localhost:8000"
TEST_FILE = "tests/test_document.txt"

def test_supported_formats() -> bool:
    """Test the supported formats endpoint."""
    print("\nTesting /v1/documents/supported-formats...")
    try:
        response = requests.get(f"{BASE_URL}/v1/documents/supported-formats")
        response.raise_for_status()
        formats = response.json()
        print(f"Supported formats: {formats}")
        return True
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

def test_document_upload() -> Dict[str, Any]:
    """Test document upload and processing."""
    print("\nTesting document upload and processing...")
    try:
        with open(TEST_FILE, 'rb') as f:
            files = {'file': (os.path.basename(TEST_FILE), f, 'text/plain')}
            response = requests.post(
                f"{BASE_URL}/v1/documents/process",
                files=files,
                params={"chunk_size": 500}
            )
        response.raise_for_status()
        result = response.json()
        print(f"Document processed successfully!")
        print(f"Filename: {result['filename']}")
        print(f"File type: {result['file_type']}")
        print(f"Number of chunks: {result['chunk_count']}")
        
        # Print first chunk as sample
        if result['chunks']:
            first_chunk = result['chunks'][0]
            print("\nFirst chunk:")
            print(json.dumps(first_chunk, indent=2))
            
        return result
    except Exception as e:
        print(f"Error: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response status: {e.response.status_code}")
            print(f"Response body: {e.response.text}")
        raise

def test_health_check() -> bool:
    """Test the health check endpoint."""
    print("\nTesting /health...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        response.raise_for_status()
        health = response.json()
        print(f"Health status: {health['status']}")
        print(f"Model loaded: {health['model_loaded']}")
        return health['status'] == 'ok'
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

def main():
    """Run all tests."""
    print("Starting Document Processing API tests...")
    
    # Check if API is running
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code != 200:
            print("Error: API is not running. Please start the API server first.")
            return
    except requests.exceptions.RequestException:
        print("Error: Could not connect to the API. Is the server running?")
        return
    
    # Run tests
    all_tests_passed = True
    
    # Test health check
    if not test_health_check():
        all_tests_passed = False
    
    # Test supported formats
    if not test_supported_formats():
        all_tests_passed = False
    
    # Test document processing
    try:
        test_document_upload()
    except Exception:
        all_tests_passed = False
    
    # Print summary
    print("\nTest Summary:")
    print("-" * 50)
    print(f"All tests {'PASSED' if all_tests_passed else 'FAILED'}")

if __name__ == "__main__":
    main()
