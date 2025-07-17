"""
Tests for the document service
"""

import pytest

from services.document_service import DocumentService


@pytest.fixture
def document_service():
    return DocumentService(db=None, node_id="test-node")


def test_load_document_success(document_service):
    test_content = "This is a test document. It contains some text."
    result = document_service.load_document(file_content=test_content, file_type="txt")
    assert result["status"] == "success"
    assert "content" in result
    assert "metadata" in result
    assert result["metadata"]["file_type"] == "txt"


def test_load_document_invalid_content(document_service):
    result = document_service.load_document(file_content="", file_type="txt")
    assert result["status"] == "error"
    assert "error" in result


def test_load_document_invalid_type(document_service):
    result = document_service.load_document(
        file_content="Test content", file_type="pdf"
    )
    assert result["status"] == "error"
    assert "error" in result


def test_summarize_text(document_service):
    test_text = "This is a longer text that needs to be summarized. It contains multiple sentences and should be reduced to a concise summary."
    result = document_service.summarize_text(test_text)
    assert result["status"] == "success"
    assert "summary" in result


def test_redact_text(document_service):
    test_text = "This is a test with sensitive information like 123-45-6789"
    result = document_service.redact_text(
        text=test_text, sensitive_terms=["123-45-6789"]
    )
    assert result["status"] == "success"
    assert "redacted_text" in result


def test_spellcheck_text(document_service):
    test_text = "This is a text with some misspelled words"
    result = document_service.spellcheck_text(test_text)
    assert result["status"] == "success"
    assert "spellchecked_text" in result
