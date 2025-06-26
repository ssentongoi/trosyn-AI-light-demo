"""
Tests for the document API endpoints.
"""
import io
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


def test_upload_document(client: TestClient, db_session, storage_service):
    """Test uploading a new document."""
    # Create a test file
    test_content = b"Test document content"
    test_file = io.BytesIO(test_content)
    
    # Upload the document
    response = client.post(
        "/api/v1/documents",
        files={"file": ("test.txt", test_file, "text/plain")},
        data={
            "metadata": json.dumps({"test": True}),
            "created_by": "test-user"
        }
    )
    
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["title"] == "test.txt"
    assert data["mime_type"] == "text/plain"
    assert data["size_bytes"] == len(test_content)
    assert data["metadata"]["test"] is True


def test_get_document(client: TestClient, test_document):
    """Test retrieving document metadata."""
    response = client.get(f"/api/v1/documents/{test_document.id}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_document.id
    assert data["title"] == test_document.title


def test_download_document(client: TestClient, test_document):
    """Test downloading a document file."""
    response = client.get(f"/api/v1/documents/{test_document.id}/download")
    
    assert response.status_code == 200
    assert response.content == b"Test document content"
    assert "content-disposition" in response.headers
    assert "test.txt" in response.headers["content-disposition"]


def test_list_documents(client: TestClient, test_document):
    """Test listing documents."""
    response = client.get("/api/v1/documents")
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert any(doc["id"] == test_document.id for doc in data)


def test_update_document_metadata(client: TestClient, test_document):
    """Test updating document metadata."""
    update_data = {
        "title": "Updated Title",
        "metadata": {"test": False, "new_field": "value"}
    }
    
    response = client.patch(
        f"/api/v1/documents/{test_document.id}",
        json=update_data
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"
    assert data["metadata"]["test"] is False
    assert data["metadata"]["new_field"] == "value"


def test_delete_document_soft(client: TestClient, test_document):
    """Test soft deleting a document."""
    response = client.delete(f"/api/v1/documents/{test_document.id}")
    
    assert response.status_code == 204
    
    # Verify the document is marked as deleted
    response = client.get(f"/api/v1/documents/{test_document.id}")
    assert response.status_code == 200
    assert response.json()["is_deleted"] is True


def test_restore_document(client: TestClient, test_document):
    """Test restoring a soft-deleted document."""
    # First delete the document
    client.delete(f"/api/v1/documents/{test_document.id}")
    
    # Now restore it
    response = client.post(f"/api/v1/documents/{test_document.id}/restore")
    
    assert response.status_code == 200
    assert response.json()["is_deleted"] is False


def test_get_document_versions(client: TestClient, test_document):
    """Test retrieving document versions."""
    response = client.get(f"/api/v1/documents/{test_document.id}/versions")
    
    assert response.status_code == 200
    versions = response.json()
    assert isinstance(versions, list)
    assert len(versions) == 1
    assert versions[0]["document_id"] == test_document.id
    assert versions[0]["version_number"] == 1
