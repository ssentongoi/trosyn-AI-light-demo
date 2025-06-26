"""
Tests for the sync engine.
"""
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock

import pytest

from src.trosyn_sync.models.node import Node, NodeSyncStatus
from src.trosyn_sync.services.sync_engine import SyncEngine


@pytest.mark.asyncio
async def test_sync_with_node_new_document(db_session):
    """Test syncing when the remote node has a new document."""
    # Create a remote node
    remote_node = Node(
        node_id="remote-node",
        node_type="TROSYSN_DEPT_NODE",
        display_name="Remote Node",
        api_url="http://remote-node:8000",
        api_key="test-api-key"
    )
    db_session.add(remote_node)
    db_session.commit()
    
    # Mock the remote API client
    mock_client = AsyncMock()
    mock_client.get_document_manifest.return_value = [
        {
            "id": "doc1",
            "title": "test.txt",
            "mime_type": "text/plain",
            "size_bytes": 18,
            "current_version_id": "ver1",
            "metadata": {"test": True},
            "versions": [
                {
                    "id": "ver1",
                    "version_number": 1,
                    "version_hash": "hash1",
                    "size_bytes": 18,
                    "mime_type": "text/plain",
                    "is_encrypted": False,
                    "created_at": "2023-01-01T00:00:00",
                    "created_by": "test"
                }
            ]
        }
    ]
    
    # Mock the download
    mock_client.download_document.return_value = (b"Test document content", "text/plain")
    
    # Create sync engine
    sync_engine = SyncEngine(db_session, "local-node")
    
    # Patch the API client
    with patch('src.trosyn_sync.services.sync_engine.get_node_api_client', return_value=mock_client):
        # Perform sync
        result = await sync_engine.sync_with_node("remote-node")
        
        # Verify the result
        assert result["status"] == "completed"
        assert result["actions_taken"] == 1
        assert result["documents_added"] == 1
        
        # Verify the document was created locally
        from src.trosyn_sync.models.document import Document
        doc = db_session.query(Document).filter(Document.id == "doc1").first()
        assert doc is not None
        assert doc.title == "test.txt"
        
        # Verify the sync status was updated
        status = db_session.query(NodeSyncStatus).filter_by(
            node_id="local-node",
            remote_node_id="remote-node"
        ).first()
        assert status is not None
        assert status.last_sync_status == "completed"


@pytest.mark.asyncio
async def test_sync_with_node_conflict_resolution(db_session):
    """Test conflict resolution during sync."""
    # Create local and remote nodes
    remote_node = Node(
        node_id="remote-node",
        node_type="TROSYSN_DEPT_NODE",
        display_name="Remote Node",
        api_url="http://remote-node:8000",
        api_key="test-api-key"
    )
    db_session.add(remote_node)
    
    # Create a local document with the same ID but different content
    from src.trosyn_sync.models.document import Document, DocumentVersion
    
    local_doc = Document(
        id="doc1",
        title="local.txt",
        mime_type="text/plain",
        size_bytes=20,
        metadata_={"source": "local"}
    )
    db_session.add(local_doc)
    db_session.flush()
    
    local_version = DocumentVersion(
        document_id=local_doc.id,
        version_number=1,
        version_hash="local-hash",
        size_bytes=20,
        storage_path="/path/to/local",
        mime_type="text/plain",
        is_encrypted=False,
        created_by="local"
    )
    db_session.add(local_version)
    db_session.flush()
    
    local_doc.current_version_id = local_version.id
    db_session.commit()
    
    # Mock the remote API client
    mock_client = AsyncMock()
    mock_client.get_document_manifest.return_value = [
        {
            "id": "doc1",
            "title": "remote.txt",
            "mime_type": "text/plain",
            "size_bytes": 25,
            "current_version_id": "ver1",
            "metadata": {"source": "remote"},
            "versions": [
                {
                    "id": "ver1",
                    "version_number": 1,
                    "version_hash": "remote-hash",
                    "size_bytes": 25,
                    "mime_type": "text/plain",
                    "is_encrypted": False,
                    "created_at": "2023-01-02T00:00:00",
                    "created_by": "remote"
                }
            ]
        }
    ]
    
    # Mock the download
    mock_client.download_document.return_value = (b"Remote document content", "text/plain")
    
    # Create sync engine with conflict resolution strategy
    sync_engine = SyncEngine(db_session, "local-node")
    
    # Patch the API client
    with patch('src.trosyn_sync.services.sync_engine.get_node_api_client', return_value=mock_client):
        # Perform sync with remote-wins strategy
        result = await sync_engine.sync_with_node(
            "remote-node",
            conflict_resolution="remote-wins"
        )
        
        # Verify the result
        assert result["status"] == "completed"
        assert result["conflicts_resolved"] == 1
        
        # Verify the local document was updated
        from src.trosyn_sync.models.document import Document
        doc = db_session.query(Document).filter(Document.id == "doc1").first()
        assert doc.title == "remote.txt"
        assert doc.metadata_["source"] == "remote"


@pytest.mark.asyncio
async def test_sync_with_node_network_error(db_session):
    """Test handling of network errors during sync."""
    # Create a remote node
    remote_node = Node(
        node_id="remote-node",
        node_type="TROSYSN_DEPT_NODE",
        display_name="Remote Node",
        api_url="http://unreachable:8000",
        api_key="test-api-key"
    )
    db_session.add(remote_node)
    db_session.commit()
    
    # Create sync engine
    sync_engine = SyncEngine(db_session, "local-node")
    
    # Perform sync (should raise an exception)
    with pytest.raises(Exception):
        await sync_engine.sync_with_node("remote-node")
    
    # Verify the sync status was updated with error
    status = db_session.query(NodeSyncStatus).filter_by(
        node_id="local-node",
        remote_node_id="remote-node"
    ).first()
    assert status is not None
    assert status.last_sync_status == "error"
