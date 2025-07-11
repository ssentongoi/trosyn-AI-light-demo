"""
Tests for Trosyn Sync models.
"""
import pytest
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from trosyn_sync.models.document import Document, DocumentVersion, DocumentSyncStatus
from trosyn_sync.models.node import Node, NodeSyncStatus, SyncQueue

def test_document_model(db: Session):
    """Test Document model creation and relationships."""
    # Create a document
    doc = Document(
        title="Test Document",
        mime_type="text/plain",
        file_extension=".txt",
        size_bytes=1024,
        is_deleted=False
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    
    assert doc.id is not None
    assert doc.title == "Test Document"
    assert doc.created_at is not None
    assert doc.updated_at is not None
    
    # Test version relationship
    version = DocumentVersion(
        document_id=doc.id,
        version_number=1,
        version_hash="testhash123",
        size_bytes=1024,
        storage_path="/test/path.txt",
        mime_type="text/plain"
    )
    db.add(version)
    db.commit()
    db.refresh(version)
    
    assert version.id is not None
    assert version.document_id == doc.id
    assert version.version_number == 1
    
    # Test sync status
    sync_status = DocumentSyncStatus(
        document_id=doc.id,
        node_id="test-node-1",
        version_id=version.id,
        sync_status="synced"
    )
    db.add(sync_status)
    db.commit()
    db.refresh(sync_status)
    
    assert sync_status.id is not None
    assert sync_status.document_id == doc.id
    assert sync_status.node_id == "test-node-1"
    
    # Verify relationships
    db.refresh(doc)
    assert len(doc.versions) == 1
    assert doc.versions[0].version_number == 1
    assert doc.versions[0].id == version.id


def test_node_model(db: Session):
    """Test Node model creation and relationships."""
    # Create a node
    node = Node(
        node_id="test-node-1",
        node_type="TROSYSN_DEPT_NODE",
        display_name="Test Node",
        hostname="test-node-1.local",
        ip_address="192.168.1.100",
        port=8000,
        is_online=True,
        is_trusted=True
    )
    db.add(node)
    db.commit()
    db.refresh(node)
    
    assert node.id is not None
    assert node.node_id == "test-node-1"
    assert node.display_name == "Test Node"
    assert node.is_online is True
    assert node.is_trusted is True
    
    # Test node sync status
    sync_status = NodeSyncStatus(
        node_id=node.id,
        remote_node_id="test-node-2",
        sync_status="idle"
    )
    db.add(sync_status)
    db.commit()
    db.refresh(sync_status)
    
    assert sync_status.id is not None
    assert sync_status.node_id == node.id
    assert sync_status.remote_node_id == "test-node-2"
    
    # Create a document for sync queue testing
    doc = Document(
        title="Test Document for Sync",
        mime_type="text/plain",
        file_extension=".txt",
        size_bytes=2048
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    
    # Create a document version
    version = DocumentVersion(
        document_id=doc.id,
        version_number=1,
        version_hash="testhash456",
        size_bytes=2048,
        storage_path="/test/sync.txt",
        mime_type="text/plain"
    )
    db.add(version)
    db.commit()
    db.refresh(version)
    
    # Test sync queue
    sync_queue = SyncQueue(
        document_id=doc.id,
        node_id=node.id,
        version_id=version.id,
        status="pending"
    )
    db.add(sync_queue)
    db.commit()
    db.refresh(sync_queue)
    
    assert sync_queue.id is not None
    assert sync_queue.document_id == doc.id
    assert sync_queue.node_id == node.id
    assert sync_queue.status == "pending"
    
    # Verify relationships
    db.refresh(node)
    assert len(node.sync_statuses) == 1
    assert node.sync_statuses[0].remote_node_id == "test-node-2"
