"""Integration tests for conflict resolution in the Trosyn Sync system."""

import asyncio
import json
import os
import shutil
import tempfile
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import pytest
from fastapi.testclient import TestClient

from trosyn_sync.storage.models import Document, ConflictInfo
from trosyn_sync.sync.engine import SyncEngine, ConflictResolutionStrategy
from trosyn_sync.schemas.sync import SyncRequest
from trosyn_sync.storage.dummy import save_document, get_document_by_id
from trosyn_sync.config import settings

# Test data
TEST_DOC_ID = "test-doc-1"
TEST_USER_1 = "user1"
TEST_USER_2 = "user2"

def create_test_document(
    doc_id: str = TEST_DOC_ID,
    content: str = "Initial content",
    version: int = 1,
    last_modified_by: str = TEST_USER_1,
    last_modified: Optional[float] = None,
    conflict: Optional[ConflictInfo] = None,
    **kwargs
) -> Document:
    """Helper to create a test document with the given parameters.
    
    Args:
        doc_id: Document ID
        content: Document content
        version: Document version
        last_modified_by: User who last modified the document
        last_modified: Optional timestamp (float), will use current time if not provided
        conflict: Optional conflict information
        **kwargs: Additional fields to set on the document
        
    Returns:
        A new Document instance
    """
    if last_modified is None:
        last_modified = time.time()
    
    # Convert timestamp to ISO format string
    last_modified_iso = datetime.fromtimestamp(last_modified, tz=timezone.utc).isoformat()
    
    return Document(
        id=doc_id,
        version=version,
        content=content,
        title=f"Test Document {doc_id}",
        last_modified=last_modified_iso,
        last_modified_by=last_modified_by,
        file_path=f"docs/{doc_id}.md",
        metadata={"created_by": last_modified_by},
        conflict=conflict,
        **kwargs
    )

class TestConflictResolution:
    """Test suite for conflict resolution functionality."""

    @pytest.fixture(autouse=True)
    def setup_method(self, tmp_path):
        """Set up test environment before each test."""
        # Set up test storage directory
        self.storage_dir = tmp_path / "test_storage"
        self.storage_dir.mkdir()
        
        # Set environment variable for storage path
        os.environ["STORAGE_PATH"] = str(self.storage_dir)
        
        # Set up sync engine with default conflict strategy
        self.engine = SyncEngine(conflict_strategy="merge_with_conflict")
        
        # Save initial document
        self.initial_doc = create_test_document()
        asyncio.run(save_document(self.initial_doc))
        
        yield
        
        # Cleanup
        shutil.rmtree(self.storage_dir, ignore_errors=True)
    
    async def test_no_conflict_same_content(self):
        """Test that no conflict is detected when documents are identical."""
        # Create a sync request with the same document
        request = SyncRequest(
            node_id="test-node-1",
            documents=[self.initial_doc],
            last_sync_time=0,
            manifest=[{"id": self.initial_doc.id, "version": self.initial_doc.version}]
        )
        
        # Get sync plan
        plan = await self.engine.get_sync_plan(request)
        
        # Verify the plan indicates we need to download the document
        # since we can't be sure the content is the same without checking
        assert len(plan.documents_to_download) == 1
        assert plan.documents_to_download[0].id == TEST_DOC_ID
        assert len(plan.documents_to_upload) == 0
    
    async def test_detect_conflict_same_version_different_content(self):
        """Test that a conflict is detected when documents have same version but different content."""
        # Create a modified version of the document with same version but different content
        modified_doc = create_test_document(
            content="Modified content",
            version=self.initial_doc.version,  # Same version
            last_modified_by=TEST_USER_2,
            last_modified=time.time() + 3600  # Make it newer
        )
        
        request = SyncRequest(
            node_id="test-node-1",
            documents=[modified_doc],
            last_sync_time=0,
            manifest=[{"id": modified_doc.id, "version": modified_doc.version}]
        )
        
        # Get sync plan
        plan = await self.engine.get_sync_plan(request)
        
        # Verify the plan indicates we need to download the remote document
        # since it has a newer timestamp
        assert len(plan.documents_to_download) == 1
        assert plan.documents_to_download[0].id == TEST_DOC_ID
    
    async def test_resolve_conflict_last_write_wins(self):
        """Test that last-write-wins strategy works correctly."""
        # Create a conflict scenario
        doc1 = create_test_document(version=2, last_modified=time.time() - 3600)  # Older
        doc2 = create_test_document(version=2, last_modified=time.time())  # Newer
        
        # Use the strategy directly
        resolved = await ConflictResolutionStrategy.last_write_wins(doc1, doc2)
        
        # Verify the newer document is kept
        assert resolved.content == doc2.content
        assert resolved.last_modified == doc2.last_modified
    
    async def test_resolve_conflict_merge(self):
        """Test that merge strategy works correctly."""
        # Create documents with different content
        doc1 = create_test_document(
            content="First line\nSecond line",
            version=2,
            last_modified_by=TEST_USER_1,
            last_modified=time.time() - 3600
        )
        doc2 = create_test_document(
            content="First line\nModified second line\nThird line",
            version=2,
            last_modified_by=TEST_USER_2,
            last_modified=time.time()
        )
        
        # Use the strategy directly
        resolved = await ConflictResolutionStrategy.merge_with_conflict(doc1, doc2)
        
        # The merge strategy should keep the local document (doc1) 
        # and add the remote document (doc2) as a conflict
        assert resolved.content == doc1.content  # Keeps local content
        assert hasattr(resolved, 'conflicts') and resolved.conflicts
        # Check that the remote content is in the conflicts
        assert any(conflict.content == doc2.content for conflict in resolved.conflicts)
    
    async def test_sync_with_conflict_resolution(self):
        """Test end-to-end sync with conflict resolution."""
        # Local document with changes
        local_doc = create_test_document(
            content="Local changes",
            version=2,
            last_modified_by=TEST_USER_1,
            last_modified=time.time() - 3600  # Make it older
        )
        
        # Remote document with different changes
        remote_doc = create_test_document(
            content="Remote changes",
            version=2,  # Same version as local
            last_modified_by=TEST_USER_2,
            last_modified=time.time()  # Make it newer
        )
        
        # Save local document
        await save_document(local_doc)
        
        # Create sync request with remote document
        request = SyncRequest(
            node_id="test-node-2",
            documents=[remote_doc],
            last_sync_time=0,
            manifest=[{"id": remote_doc.id, "version": remote_doc.version}]
        )
        
        # Get sync plan - since both documents have the same version but possibly different content,
        # the sync plan should include the document in the download list
        plan = await self.engine.get_sync_plan(request)
        
        # Verify the plan includes the document for download since we can't be sure of content
        assert len(plan.documents_to_download) == 1
        assert plan.documents_to_download[0].id == TEST_DOC_ID
        assert len(plan.documents_to_upload) == 0
        
        # Create an async mock API client
        class MockApiClient:
            async def get_document(self, doc_id):
                return remote_doc.model_dump()
                
            async def close(self):
                pass
                
        # Create a document version for the test
        doc_version = type('DocumentVersion', (), {'id': TEST_DOC_ID, 'version': remote_doc.version})()
        
        # Process the document download with conflict resolution
        api_client = MockApiClient()
        await self.engine._process_document_download(api_client, doc_version)
        
        # Verify local storage was updated with the remote document
        stored_doc = await get_document_by_id(TEST_DOC_ID)
        assert stored_doc is not None
        
        # The document should preserve the local content and record the remote as a conflict
        assert stored_doc.content == local_doc.content  # Local content is preserved
        assert hasattr(stored_doc, 'conflicts') and stored_doc.conflicts  # Conflict is recorded
        # Verify the conflict contains the remote content
        assert any(conflict.content == remote_doc.content for conflict in stored_doc.conflicts)

# Run tests
if __name__ == "__main__":
    pytest.main(["-v", "-s", __file__])
