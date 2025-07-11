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
from src.trosyn_sync.models.node import Node
from src.trosyn_sync.services.storage import StorageService

# The storage_service fixture is defined in conftest.py and is session-scoped

@pytest.fixture
def test_node(db_session: Session) -> Node:
    """Creates a test node for ownership."""
    node = db_session.query(Node).filter(Node.node_id == "storage-test-node").first()
    if not node:
        node = Node(
            node_id="storage-test-node",
            node_type="TROSYSN_DEPT_NODE",
            hostname="storage-host",
            ip_address="127.0.0.1",
            port=9000
        )
        db_session.add(node)
        db_session.commit()
    return node

@pytest.fixture
def test_document(db_session: Session, storage_service: StorageService, test_node: Node) -> Document:
    """Create a test document with a node and version for storage tests."""
    test_content = b"This is the content for the storage test document."
    test_file = io.BytesIO(test_content)
    
    doc, _ = storage_service.store_document(
        db_session,
        test_file,
        "storage_test_doc.txt",
        "text/plain",
        owner_node_id=test_node.id,
        created_by=test_node.node_id
    )
    return doc

def test_store_document(storage_service: StorageService, db_session: Session, test_node: Node):
    """Test storing a new document."""
    test_content = b"Test document content"
    test_file = io.BytesIO(test_content)
    
    doc, version = storage_service.store_document(
        db_session,
        test_file,
        "test.txt",
        "text/plain",
        owner_node_id=test_node.id,
        metadata={"test": True},
        created_by=test_node.node_id
    )
    
    assert doc is not None
    assert doc.id is not None
    assert doc.title == "test.txt"
    assert doc.mime_type == "text/plain"
    assert doc.size_bytes == len(test_content)
    assert doc.metadata_ == {"test": True}
    
    assert version is not None
    assert version.document_id == doc.id
    assert version.version_number == 1
    assert version.size_bytes == len(test_content)
    assert version.mime_type == "text/plain"
    assert version.is_encrypted is False
    
    assert Path(version.storage_path).exists()
    with open(version.storage_path, "rb") as f:
        assert f.read() == test_content

def test_create_version(storage_service: StorageService, test_document: Document, test_node: Node, db_session: Session):
    """Test creating a new version of a document."""
    initial_version_id = test_document.current_version_id
    new_content = b"Updated test document content"
    test_file = io.BytesIO(new_content)

    version = storage_service.create_version(
        db=db_session,
        document_id=test_document.id,
        file_obj=test_file,
        filename="updated.txt",
        mime_type="text/plain",
        created_by=test_node.node_id
    )

    db_session.refresh(test_document)

    assert version is not None
    assert version.id != initial_version_id
    assert version.version_number == 2
    assert version.document_id == test_document.id
    assert test_document.current_version_id == version.id
    assert test_document.size_bytes == len(new_content)
    assert Path(version.storage_path).exists()
    with open(version.storage_path, "rb") as f:
        assert f.read() == new_content

def test_get_document_file(storage_service: StorageService, test_document: Document, db_session: Session):
    """Test retrieving a document file."""
    file_path, mime_type = storage_service.get_document_file(
        db_session,
        test_document.id
    )
    
    assert file_path.exists()
    assert mime_type == "text/plain"
    
    version = db_session.query(DocumentVersion).filter(DocumentVersion.document_id == test_document.id).first()
    file_path, mime_type = storage_service.get_document_file(
        db_session,
        test_document.id,
        version.id
    )
    
    assert file_path.exists()
    assert mime_type == "text/plain"

def test_delete_document_soft(storage_service: StorageService, test_document: Document, db_session: Session):
    """Test soft deleting a document."""
    storage_service.delete_document(db_session, test_document.id, permanent=False)
    
    db_session.refresh(test_document)
    assert test_document.is_deleted is True
    
    version = db_session.query(DocumentVersion).filter(DocumentVersion.document_id == test_document.id).first()
    assert Path(version.storage_path).exists()

def test_delete_document_permanent(storage_service: StorageService, test_document: Document, db_session: Session):
    """Test permanently deleting a document."""
    version = db_session.query(DocumentVersion).filter(DocumentVersion.document_id == test_document.id).first()
    version_path = Path(version.storage_path)
    
    storage_service.delete_document(db_session, test_document.id, permanent=True)
    
    doc = db_session.query(Document).get(test_document.id)
    assert doc is None
    
    assert not version_path.exists()

def test_duplicate_content(storage_service: StorageService, db_session: Session, test_node: Node):
    """Test that duplicate content is handled efficiently."""
    test_content = b"Test document content for duplication"
    test_file1 = io.BytesIO(test_content)
    
    doc1, version1 = storage_service.store_document(
        db_session,
        test_file1,
        "test1.txt",
        "text/plain",
        owner_node_id=test_node.id,
        created_by=test_node.node_id
    )
    
    test_file2 = io.BytesIO(test_content)
    doc2, version2 = storage_service.store_document(
        db_session,
        test_file2,
        "test2.txt",
        "text/plain",
        owner_node_id=test_node.id,
        created_by=test_node.node_id
    )
    
    assert doc1.id != doc2.id
    assert version1.version_hash == version2.version_hash
