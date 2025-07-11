"""
Tests for the document processing functionality.
"""
import os
import pytest
import shutil
from pathlib import Path
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from typing import List, Dict, Any

# Test data
TEST_DOCS_DIR = Path(__file__).parent.parent / "test_documents"
TEST_DOCS_DIR.mkdir(exist_ok=True)
SAMPLE_PDF = str(TEST_DOCS_DIR / "sample.pdf")
SAMPLE_DOCX = str(TEST_DOCS_DIR / "sample.docx")
SAMPLE_TXT = str(TEST_DOCS_DIR / "sample.txt")

@pytest.fixture(scope="module", autouse=True)
def setup_test_documents():
    """Setup test documents before tests run."""
    # Create sample text file
    with open(SAMPLE_TXT, 'w') as f:
        f.write("This is a sample text file for testing.\n" * 10)
    
    # Create a minimal PDF file if it doesn't exist
    if not os.path.exists(SAMPLE_PDF):
        from fpdf import FPDF
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=12)
        pdf.cell(200, 10, txt="Sample PDF for testing", ln=True, align='C')
        pdf.output(SAMPLE_PDF)
    
    # Create a minimal DOCX file if it doesn't exist
    if not os.path.exists(SAMPLE_DOCX):
        from docx import Document
        doc = Document()
        doc.add_paragraph("Sample DOCX for testing")
        doc.save(SAMPLE_DOCX)
    
    yield  # Test runs here
    
    # Cleanup
    if os.path.exists(TEST_DOCS_DIR):
        shutil.rmtree(TEST_DOCS_DIR)

def test_document_processing_endpoint(client: TestClient, mock_llm_service, mock_vector_store):
    """Test document processing endpoint with a sample PDF."""
    # Setup test file
    test_file = SAMPLE_TXT  # Using text file for simpler testing
    
    with open(test_file, "rb") as f:
        response = client.post(
            "/api/v1/documents",
            files={"file": ("test.txt", f, "text/plain")},
            data={"chunk_size": 500, "add_to_vector_store": True}
        )
    
    assert response.status_code == 200, f"Unexpected status code: {response.status_code}\n{response.text}"
    result = response.json()
    assert "id" in result, "Response missing document ID"
    assert "filename" in result, "Response missing filename"

def test_document_search(client: TestClient, mock_llm_service, mock_vector_store):
    """Test document search functionality."""
    # Mock the vector store search
    mock_vector_store.search.return_value = [
        {
            "id": "doc1",
            "text": "Sample text content",
            "score": 0.95,
            "metadata": {"source": "test.txt"}
        }
    ]
    
    # Test search
    search_query = {"query": "sample text content"}
    search_response = client.post(
        "/api/v1/documents/search",
        json=search_query
    )
    
    assert search_response.status_code == 200, f"Search failed: {search_response.text}"
    result = search_response.json()
    assert "results" in result, "Search results missing 'results' key"
    assert isinstance(result["results"], list), "Results should be a list"

def test_unsupported_file_type(client: TestClient):
    """Test handling of unsupported file types."""
    test_file = TEST_DOCS_DIR / "unsupported.xyz"
    test_file.write_text("Test content")
    
    with open(test_file, "rb") as f:
        response = client.post(
            "/api/v1/documents",
            files={"file": ("unsupported.xyz", f, "application/octet-stream")}
        )
    
    assert response.status_code == 400, f"Expected 400 for unsupported file type, got {response.status_code}"
    response_data = response.json()
    assert "detail" in response_data, "Error response missing 'detail' field"

def test_large_document_processing(client: TestClient, mock_llm_service, tmp_path):
    """Test processing of large documents."""
    # Create a large text file (1MB)
    large_file = tmp_path / "large.txt"
    with open(large_file, "w") as f:
        f.write("Large document content\n" * 50000)  # ~1MB
    
    with open(large_file, "rb") as f:
        response = client.post(
            "/api/v1/documents",
            files={"file": ("large.txt", f, "text/plain")},
            data={"chunk_size": 2000}
        )
    
    assert response.status_code == 200, f"Failed to process large file: {response.text}"
    result = response.json()
    assert "id" in result, "Response missing document ID"

# Fixtures for testing
@pytest.fixture
def mock_llm_service():
    with patch("src.trosyn_sync.services.llm_service.LLMService") as mock_llm:
        # Mock embedding generation
        mock_llm.return_value.generate_embeddings.return_value = [0.1] * 384
        # Mock text generation
        mock_llm.return_value.generate_text.return_value = "Generated text response"
        yield mock_llm.return_value

@pytest.fixture
def mock_vector_store():
    with patch("src.trosyn_sync.services.vector_store.VectorStore") as mock_vs:
        # Mock document addition
        mock_vs.return_value.add_documents.return_value = ["doc1", "doc2"]
        # Mock search
        mock_vs.return_value.search.return_value = [
            {"id": "doc1", "text": "Sample text", "score": 0.95, "metadata": {}}
        ]
        yield mock_vs.return_value
