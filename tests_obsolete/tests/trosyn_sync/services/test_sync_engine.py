"""Unit tests for the sync engine's conflict resolution functionality."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from trosyn_sync.services.sync_engine import SyncEngine
from trosyn_sync.models import Document, DocumentVersion, Node

# Test data
TEST_NODE_ID = "test-node-123"
TEST_DOC_ID = "doc-123"
TEST_VERSION_1 = "version-1"
TEST_VERSION_2 = "version-2"

# Fixtures
@pytest.fixture
def mock_db_session():
    """Create a mock database session."""
    session = MagicMock(spec=Session)
    return session

@pytest.fixture
def mock_http_client():
    """Create a mock HTTP client."""
    return AsyncMock()

@pytest.fixture
def sync_engine(mock_db_session, mock_http_client):
    """Create a SyncEngine instance with mocked dependencies."""
    local_node = Node(
        id=1,
        node_id=TEST_NODE_ID,
        name="Test Node",
        api_url="http://localhost:8000",
        default_conflict_strategy="newer_wins"
    )
    
    engine = SyncEngine(
        db=mock_db_session,
        local_node=local_node,
        http_client=mock_http_client
    )
    return engine

# Test cases
class TestConflictResolution:
    """Test conflict resolution functionality."""
    
    async def test_detect_true_conflict(self, sync_engine):
        """Test detection of true conflicts when documents have diverged."""
        # Create test manifests with a common ancestor but different versions
        local_manifest = {
            "documents": [{
                "document_id": TEST_DOC_ID,
                "version_id": "local-version",
                "version_hash": "hash-local",
                "updated_at": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
                "ancestors": ["common-ancestor"]
            }]
        }
        
        remote_manifest = {
            "documents": [{
                "document_id": TEST_DOC_ID,
                "version_id": "remote-version",
                "version_hash": "hash-remote",
                "updated_at": datetime.utcnow().isoformat(),
                "ancestors": ["common-ancestor"]
            }]
        }
        
        # Determine sync actions
        actions = sync_engine._determine_sync_actions(local_manifest, remote_manifest)
        
        # Should detect a conflict
        assert len(actions) == 1
        assert actions[0]["action"] == "conflict"
        assert actions[0]["reason"] == "diverged_changes"

    async def test_metadata_merge(self, sync_engine, mock_db_session):
        """Test merging of document metadata."""
        # Setup test document
        doc = Document(
            id=TEST_DOC_ID,
            metadata_={"title": "Original Title", "tags": ["old"]}
        )
        mock_db_session.query.return_value.get.return_value = doc
        
        # Define local and remote metadata
        local_metadata = {"title": "Local Title", "tags": ["local"]}
        remote_metadata = {"title": "Remote Title", "description": "New Description"}
        
        # Perform the merge
        result = await sync_engine._merge_document_metadata(
            doc_id=TEST_DOC_ID,
            local_metadata=local_metadata,
            remote_metadata=remote_metadata,
            remote_node_id=2
        )
        
        # Verify the result
        assert result["document_id"] == TEST_DOC_ID
        assert "merged_metadata" in result
        
        # Check that remote values took precedence
        assert result["merged_metadata"]["title"] == "Remote Title"
        
        # Check that local-only fields were preserved
        assert "tags" in result["merged_metadata"]
        
        # Check that remote fields were added
        assert "description" in result["merged_metadata"]
        
        # Check that merge was logged
        assert "_sync_notes" in result["merged_metadata"]

    async def test_resolve_conflict_local_wins(self, sync_engine, mock_http_client):
        """Test conflict resolution with 'local_wins' strategy."""
        # Setup test data
        conflict_action = {
            "action": "conflict",
            "document_id": TEST_DOC_ID,
            "local_version_id": "local-version",
            "remote_version_id": "remote-version",
            "local_updated": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
            "remote_updated": datetime.utcnow().isoformat(),
            "reason": "diverged_changes"
        }
        
        # Mock the push_document method
        sync_engine._push_document = AsyncMock(return_value={"status": "success"})
        
        # Resolve with local_wins strategy
        result = await sync_engine._resolve_document_conflict(
            doc_id=TEST_DOC_ID,
            local_version_id="local-version",
            remote_version_id="remote-version",
            remote_node=Node(id=2, node_id="remote-node", name="Remote", api_url="http://remote"),
            strategy="local_wins"
        )
        
        # Verify the result
        assert result["success"] is True
        assert result["strategy_used"] == "local_wins"
        assert result["action"] == "pushed_local"
        
        # Verify push_document was called with the local version
        sync_engine._push_document.assert_awaited_once()
        assert sync_engine._push_document.await_args[0][1] == "local-version"

    async def test_merge_document_versions(self, sync_engine, mock_db_session):
        """Test merging of document versions."""
        # Setup test document
        doc = Document(
            id=TEST_DOC_ID,
            metadata_={"title": "Original Title"}
        )
        mock_db_session.query.return_value.get.return_value = doc
        
        # Mock remote metadata
        remote_metadata = {
            "version_id": "remote-version",
            "metadata": {"title": "Remote Title", "description": "New Description"}
        }
        
        # Mock push_document
        sync_engine._push_document = AsyncMock(return_value={"status": "pushed"})
        
        # Perform the merge
        result = await sync_engine._merge_document_versions(
            doc_id=TEST_DOC_ID,
            local_version_id="local-version",
            remote_metadata=remote_metadata,
            remote_node=Node(id=2, node_id="remote-node", name="Remote", api_url="http://remote")
        )
        
        # Verify the result
        assert "merged_metadata" in result
        assert result["merged_metadata"]["title"] == "Remote Title"
        assert "_sync_notes" in result["merged_metadata"]
        
        # Verify the document was updated
        assert doc.metadata_["title"] == "Remote Title"
        assert "description" in doc.metadata_
        
        # Verify push_document was called
        sync_engine._push_document.assert_awaited_once()

    async def test_conflict_resolution_logging(self, sync_engine, caplog):
        """Test that conflict resolutions are properly logged."""
        # Setup test data
        resolution = {
            "document_id": TEST_DOC_ID,
            "local_version_id": "local-version",
            "remote_version_id": "remote-version",
            "strategy_used": "test_strategy",
            "action": "test_action",
            "success": True
        }
        
        # Call the logging method
        sync_engine._log_conflict_resolution(resolution)
        
        # Verify the log was created
        assert f"Conflict resolution: {resolution}" in caplog.text
