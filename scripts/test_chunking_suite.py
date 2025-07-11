#!/usr/bin/env python3
"""
Comprehensive test suite for document chunking algorithm.
This test validates that your chunking implementation works correctly.
"""

import sys
import os
from pathlib import Path
import math
from typing import List

# Add the src directory to the Python path
project_root = Path(__file__).parent
sys.path.append(str(project_root))
sys.path.append(str(project_root / "src"))

from trosyn_sync.ai.providers.document_processor import UnstructuredDocumentProcessor

def test_chunk_function(chunk_text_func):
    """
    Test the provided chunk_text function against various scenarios.
    
    Args:
        chunk_text_func: Your chunking function that takes (text, chunk_size) and returns list of chunks
    """
    
    print("🧪 COMPREHENSIVE CHUNKING TEST SUITE")
    print("=" * 50)
    
    test_cases = [
        {
            "name": "Tiny Text",
            "text": "Hello world!",
            "chunk_size": 10,
            "description": "Text smaller than chunk size"
        },
        {
            "name": "Perfect Fit",
            "text": "A" * 20,
            "chunk_size": 20,
            "description": "Text exactly matches chunk size"
        },
        {
            "name": "Just Over",
            "text": "A" * 21,
            "chunk_size": 20,
            "description": "Text slightly larger than chunk size"
        },
        {
            "name": "Simple Sentences",
            "text": "This is sentence one. This is sentence two. This is sentence three.",
            "chunk_size": 30,
            "description": "Text with clear sentence boundaries"
        },
        {
            "name": "Repeated Pattern",
            "text": "Test sentence. " * 10,  # 150 chars
            "chunk_size": 50,
            "description": "Repetitive text pattern"
        },
        {
            "name": "No Sentence Breaks",
            "text": "This is a very long sentence without any periods or natural breaks that goes on and on",
            "chunk_size": 25,
            "description": "Text without sentence boundaries"
        },
        {
            "name": "Very Small Chunks",
            "text": "Hello world! How are you today?",
            "chunk_size": 5,
            "description": "Tiny chunk size"
        },
        {
            "name": "Large Document",
            "text": "This is a test document. " * 100,  # 2500 chars
            "chunk_size": 200,
            "description": "Large document with many sentences"
        },
        {
            "name": "Mixed Content",
            "text": "Short. This is a longer sentence with more content. Brief. Another moderately long sentence here.",
            "chunk_size": 40,
            "description": "Mixed sentence lengths"
        },
        {
            "name": "Edge Case - Single Char",
            "text": "A",
            "chunk_size": 100,
            "description": "Single character text"
        }
    ]
    
    all_passed = True
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n📋 Test {i}: {test_case['name']}")
        print(f"   {test_case['description']}")
        print(f"   Input: {len(test_case['text'])} chars, chunk_size: {test_case['chunk_size']}")
        
        try:
            chunks = chunk_text_func(test_case['text'], test_case['chunk_size'])
            
            # Test 1: Basic validation
            if not isinstance(chunks, list):
                print(f"   ❌ FAIL: Expected list, got {type(chunks)}")
                all_passed = False
                continue
                
            if len(chunks) == 0:
                print(f"   ❌ FAIL: No chunks returned")
                all_passed = False
                continue
            
            # Test 2: Size validation
            max_allowed_size = test_case['chunk_size'] + max(10, int(test_case['chunk_size'] * 0.1))
            oversized_chunks = [i for i, chunk in enumerate(chunks) if len(chunk) > max_allowed_size]
            
            if oversized_chunks:
                print(f"   ❌ FAIL: Chunks too large: {[len(chunks[i]) for i in oversized_chunks]} > {max_allowed_size}")
                all_passed = False
            else:
                print(f"   ✅ Size check passed (max: {max([len(c) for c in chunks])} ≤ {max_allowed_size})")
            
            # Test 3: Data integrity
            reconstructed = ''.join(chunks)
            if reconstructed != test_case['text']:
                print(f"   ❌ FAIL: Data loss detected")
                print(f"      Original length: {len(test_case['text'])}")
                print(f"      Reconstructed length: {len(reconstructed)}")
                all_passed = False
            else:
                print(f"   ✅ Data integrity check passed")
            
            # Test 4: Chunk count reasonableness
            expected_min_chunks = math.ceil(len(test_case['text']) / test_case['chunk_size'])
            expected_max_chunks = len(test_case['text'])  # Worst case: 1 char per chunk
            
            if not (expected_min_chunks <= len(chunks) <= expected_max_chunks):
                print(f"   ⚠️  WARNING: Unusual chunk count: {len(chunks)} (expected {expected_min_chunks}-{expected_max_chunks})")
            else:
                print(f"   ✅ Chunk count reasonable: {len(chunks)} chunks")
            
            # Test 5: No empty chunks
            empty_chunks = [i for i, chunk in enumerate(chunks) if len(chunk) == 0]
            if empty_chunks:
                print(f"   ❌ FAIL: Empty chunks found at positions: {empty_chunks}")
                all_passed = False
            else:
                print(f"   ✅ No empty chunks")
            
            # Display chunk breakdown
            print(f"   📊 Chunks: {[len(c) for c in chunks]}")
            
        except Exception as e:
            print(f"   ❌ FAIL: Exception occurred: {e}")
            all_passed = False
    
    # Summary
    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 ALL TESTS PASSED! Your chunking algorithm is working correctly.")
    else:
        print("❌ Some tests failed. Please review the issues above.")
    
    return all_passed

def example_usage():
    """
    Example of how to use this test suite with your chunking function.
    """
    # Initialize the document processor
    processor = UnstructuredDocumentProcessor()
    
    # Define a wrapper function that matches the expected signature
    def chunk_text_wrapper(text, chunk_size):
        # Our chunk_text method is an instance method, so we need to create a wrapper
        return processor.chunk_text(text, chunk_size=chunk_size)
    
    # Run the test suite with our implementation
    test_chunk_function(chunk_text_wrapper)

if __name__ == "__main__":
    print("Running comprehensive test suite for document chunking...")
    print("-" * 50)
    example_usage()
