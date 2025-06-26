"""
Tests for the document storage service.
"""
import io
import os
import shutil
from pathlib import Path

import pytest
from sqlalchemy.orm import Session

from src.trosyn_sync.models.document import Document, DocumentVersion
from src.trosyn_sync.services.storage import StorageService, storage_service


def test_store_document(storage_service: StorageService, db_session: Session):
    """Test storing a new document."""
    # Create a test file
    test_content = b"Test document content"
    test_file = io.BytesIO(test_content)
    
    # Store the document
    doc, version = storage_service.store_document(
        db_session,
        test_file,
        "test.txt",
        "text/plain",
        metadata={"test": True},
        created_by="test"
    )
    
    # Verify the document was created
    assert doc is not None
    assert doc.id is not None
    assert doc.title == "test.txt"
    assert doc.mime_type == "text/plain"
    assert doc.size_bytes == len(test_content)
    assert doc.metadata_ == {"test": True}
    
    # Verify the version was created
    assert version is not None
    assert version.document_id == doc.id
    assert version.version_number == 1
    assert version.size_bytes == len(test_content)
    assert version.mime_type == "text/plain"
    assert version.is_encrypted is False
    
    # Verify the file was stored
    assert Path(version.storage_path).exists()
    with open(version.storage_path, "rb") as f:
        assert f.read() == test_content


def test_create_version(storage_service: StorageService, test_document: Document, db_session: Session):
    """Test creating a new version of a document."""
    # Create a test file with new content
    new_content = b"Updated test document content"
    test_file = io.BytesIO(new_content)
    
    # Create a new version
    doc, version = storage_service.create_version(
        db_session,
        test_document.id,
        test_file,
        "updated.txt",
        "text/plain",
        created_by="test"
    )
    
    # Verify the document was updated
    assert doc is not None
    assert doc.id == test_document.id
    assert doc.size_bytes == len(new_content)
    
    # Verify the new version was created
    assert version is not None
    assert version.document_id == test_document.id
    assert version.version_number == 2
    assert version.size_bytes == len(new_content)
    
    # Verify the file was stored
    assert Path(version.storage_path).exists()
    with open(version.storage_path, "rb") as f:
        assert f.read() == new_content


def test_get_document_file(storage_service: StorageService, test_document: Document, db_session: Session):
    """Test retrieving a document file."""
    # Get the document file
    file_path, mime_type = storage_service.get_document_file(
        db_session,
        test_document.id
    )
    
    # Verify the file exists and has the correct MIME type
    assert file_path.exists()
    assert mime_type == "text/plain"
    
    # Test with specific version
    version = test_document.versions[0]
    file_path, mime_type = storage_service.get_document_file(
        db_session,
        test_document.id,
        version.id
    )
    
    assert file_path.exists()
    assert mime_type == "text/plain"


def test_delete_document_soft(storage_service: StorageService, test_document: Document, db_session: Session):
    """Test soft deleting a document."""
    # Soft delete the document
    storage_service.delete_document(db_session, test_document.id, permanent=False)
    
    # Verify the document is marked as deleted but still exists
    doc = db_session.query(Document).get(test_document.id)
    assert doc.is_deleted is True
    
    # Verify the file still exists
    version = test_document.versions[0]
    assert Path(version.storage_path).exists()


def test_delete_document_permanent(storage_service: StorageService, test_document: Document, db_session: Session):
    """Test permanently deleting a document."""
    # Get the version path before deletion
    version = test_document.versions[0]
    version_path = Path(version.storage_path)
    
    # Permanently delete the document
    storage_service.delete_document(db_session, test_document.id, permanent=True)
    
    # Verify the document is gone from the database
    doc = db_session.query(Document).get(test_document.id)
    assert doc is None
    
    # Verify the file was deleted
    assert not version_path.exists()


def test_duplicate_content(storage_service: StorageService, db_session: Session):
    """Test that duplicate content is handled efficiently."""
    # Create a test file
    test_content = b"Test document content"
    test_file1 = io.BytesIO(test_content)
    
    # Store the first document
    doc1, version1 = storage_service.store_document(
        db_session,
        test_file1,
        "test1.txt",
        "text/plain",
        created_by="test"
    )
    
    # Store the same content with a different filename
    test_file2 = io.BytesIO(test_content)
    doc2, version2 = storage_service.store_document(
        db_session,
        test_file2,
        "test2.txt",
        "text/plain",
        created_by="test"
    )
    
    # Verify both documents exist and have the same content
    assert doc1.id != doc2.id
    assert version1.version_hash == version2.version_hash
