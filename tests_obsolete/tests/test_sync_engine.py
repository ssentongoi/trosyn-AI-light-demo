"""
Tests for the sync engine, updated to reflect current implementation.
"""
from datetime import datetime
from unittest.mock import AsyncMock, patch, MagicMock

import pytest
import httpx

from src.trosyn_sync.models.document import Document, DocumentVersion
from src.trosyn_sync.models.node import Node, NodeSyncStatus
from src.trosyn_sync.services.sync_engine import SyncEngine


@pytest.fixture
def local_node(db_session):
    node = Node(
        node_id="local-node",
        node_type="TROSYSN_DEPT_NODE",
        hostname="local-node",
        ip_address="127.0.0.1",
        port=8001,
        api_url="http://local-node:8001"
    )
    db_session.add(node)
    db_session.commit()
    return node


@pytest.fixture
def remote_node(db_session):
    node = Node(
        node_id="remote-node",
        node_type="TROSYSN_DEPT_NODE",
        hostname="remote-node",
        ip_address="127.0.0.1",
        port=8000,
        api_url="http://remote-node:8000"
    )
    db_session.add(node)
    db_session.commit()
    return node


@pytest.mark.asyncio
async def test_sync_new_remote_document(db_session, local_node, remote_node):
    """Test that a new document on a remote node is pulled successfully."""
    sync_engine = SyncEngine(db_session, local_node.node_id)
    
    actions = [{'action': 'pull', 'document_id': 'doc1', 'version_id': 'ver1'}]

    with (patch.object(SyncEngine, '_generate_local_manifest', new_callable=AsyncMock, return_value={}),
          patch.object(SyncEngine, '_fetch_remote_manifest', new_callable=AsyncMock, return_value={'doc1': True}),
          patch.object(SyncEngine, '_determine_sync_actions', return_value=actions),
          patch.object(SyncEngine, '_pull_document', new_callable=AsyncMock, return_value={'status': 'pulled'}) as mock_pull):
        
        result = await sync_engine.sync_with_node(remote_node.node_id)
        
        assert result['status'] == 'success'
        mock_pull.assert_called_once_with('doc1', 'ver1', remote_node.api_url, remote_node.id)


@pytest.mark.asyncio
async def test_sync_network_error(db_session, local_node, remote_node):
    """Test that a network error during manifest fetch is handled gracefully."""
    sync_engine = SyncEngine(db_session, local_node.node_id)

    with (patch.object(SyncEngine, '_fetch_remote_manifest', new_callable=AsyncMock, side_effect=httpx.RequestError("Network error")),
          patch.object(SyncEngine, '_execute_sync_actions', new_callable=AsyncMock) as mock_execute):

        result = await sync_engine.sync_with_node(remote_node.node_id)

        assert result['status'] == 'error'
        assert 'Network error' in result['message']
        mock_execute.assert_not_called()
        
        db_session.commit()
        sync_status = db_session.query(NodeSyncStatus).filter_by(
            node_id=local_node.id, 
            remote_node_id=remote_node.node_id
        ).one()
        assert sync_status.sync_status == 'error'
        assert 'Network error' in sync_status.error_message


@pytest.mark.asyncio
async def test_sync_pull_failure(db_session, local_node, remote_node):
    """Test that a failure during document pull is handled and reported."""
    sync_engine = SyncEngine(db_session, local_node.node_id)

    actions = [{'action': 'pull', 'document_id': 'doc1', 'version_id': 'ver1'}]

    with (patch.object(SyncEngine, '_generate_local_manifest', new_callable=AsyncMock, return_value={}),
          patch.object(SyncEngine, '_fetch_remote_manifest', new_callable=AsyncMock, return_value={'doc1': True}),
          patch.object(SyncEngine, '_determine_sync_actions', return_value=actions),
          patch.object(SyncEngine, '_pull_document', new_callable=AsyncMock, side_effect=Exception("Pull failed")) as mock_pull):

        result = await sync_engine.sync_with_node(remote_node.node_id)

        assert result['status'] == 'error'
        assert 'Sync completed with 1 errors' in result['message']
        assert len(result['results']['errors']) == 1
        assert result['results']['errors'][0]['error'] == 'Pull failed'
        mock_pull.assert_called_once_with('doc1', 'ver1', remote_node.api_url, remote_node.id)

        db_session.commit()
        sync_status = db_session.query(NodeSyncStatus).filter_by(
            node_id=local_node.id, 
            remote_node_id=remote_node.node_id
        ).one()
        assert sync_status.sync_status == 'error'
        assert 'Sync completed with 1 errors' in sync_status.error_message
