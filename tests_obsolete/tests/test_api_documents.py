"""
Tests for the document API endpoints.
"""
import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from trosyn_sync.models import Document, DocumentVersion, Node
import uuid
from pathlib import Path

# A fixture to create a document before tests that need one
@pytest.fixture
def test_document(authenticated_client: TestClient, db_session: Session) -> Document:
    """Fixture to create a test document via API and return the model instance."""
    test_content = b"This is the content of the test document."
    test_file = ("test_document.txt", io.BytesIO(test_content), "text/plain")
    
    response = authenticated_client.post(
        "/api/v1/documents/",
        files={"file": test_file}
    )
    
    assert response.status_code == 201, "Failed to create test document in fixture"
    data = response.json()
    doc_id = data["id"]
    
    # Yield the SQLAlchemy model instance, which is needed for assertions
    doc = db_session.get(Document, doc_id)
    assert doc is not None
    yield doc
    
    # Cleanup is handled by the test transaction rollback

def test_upload_document(authenticated_client: TestClient):
    """Test uploading a new document."""
    test_content = b"A brand new document for upload test."
    test_file = ("upload_test.txt", io.BytesIO(test_content), "text/plain")

    response = authenticated_client.post(
        "/api/v1/documents/",
        files={"file": test_file}
    )

    assert response.status_code == 201, f"API Error: {response.status_code} - {response.text}"
    data = response.json()
    assert "id" in data
    assert data["title"] == "upload_test.txt"
    assert data["mime_type"] == "text/plain"
    assert data["size_bytes"] == len(test_content)
    assert not data["is_deleted"]

def test_list_documents(authenticated_client: TestClient, test_document: Document):
    """Test listing documents."""
    response = authenticated_client.get("/api/v1/documents/")
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # Check if the created test document is in the list
    assert any(doc["id"] == test_document.id for doc in data)

def test_get_document(authenticated_client: TestClient, test_document: Document):
    """Test retrieving document metadata."""
    response = authenticated_client.get(f"/api/v1/documents/{test_document.id}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_document.id
    assert data["title"] == test_document.title

def test_download_document(authenticated_client: TestClient, test_document: Document):
    """Test downloading a document file."""
    response = authenticated_client.get(f"/api/v1/documents/{test_document.id}/download")
    
    assert response.status_code == 200
    assert response.content == b"This is the content of the test document."
    assert "content-disposition" in response.headers
    assert test_document.title in response.headers["content-disposition"]

def test_update_document_metadata(authenticated_client: TestClient, test_document: Document):
    """Test updating document metadata."""
    update_data = {
        "title": "Updated Title",
        "description": "This is an updated description."
    }
    
    # The API uses PUT, not PATCH
    response = authenticated_client.put(
        f"/api/v1/documents/{test_document.id}",
        json=update_data
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"
    assert data["description"] == "This is an updated description."

def test_delete_document_soft(authenticated_client: TestClient, test_document: Document):
    """Test soft deleting a document."""
    response = authenticated_client.delete(f"/api/v1/documents/{test_document.id}")
    
    assert response.status_code == 204
    
    # Verify the document is not found via GET after soft deletion
    response = authenticated_client.get(f"/api/v1/documents/{test_document.id}")
    assert response.status_code == 404

def test_restore_document(authenticated_client: TestClient, test_document: Document):
    """Test restoring a soft-deleted document."""
    # First, delete the document
    delete_response = authenticated_client.delete(f"/api/v1/documents/{test_document.id}")
    assert delete_response.status_code == 204
    
    # Now, restore it
    restore_response = authenticated_client.post(f"/api/v1/documents/{test_document.id}/restore")
    
    assert restore_response.status_code == 200
    data = restore_response.json()
    assert not data["is_deleted"]
    
    # Verify it's accessible again
    get_response = authenticated_client.get(f"/api/v1/documents/{test_document.id}")
    assert get_response.status_code == 200

def test_get_document_versions(authenticated_client: TestClient, test_document: Document):
    """Test retrieving document versions."""
    response = authenticated_client.get(f"/api/v1/documents/{test_document.id}/versions")
    
    assert response.status_code == 200
    versions = response.json()
    assert isinstance(versions, list)
    assert len(versions) >= 1
    # The version response schema does not include document_id
    assert versions[0]["version_number"] == 1
