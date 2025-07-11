import asyncio
import pytest
from uvicorn import Config
from multiprocessing import Process
import time
import os
import tempfile
import shutil
import json
from pathlib import Path
import uuid

from trosyn_sync.storage.models import Document

# --- Test Setup: Uvicorn Server Process ---
def run_server(node_id: str, port: int, storage_dir: str):
    """Sets up and runs a Uvicorn server instance for a node."""
    # Set environment variables BEFORE importing the app
    os.environ["NODE_ID"] = node_id
    os.environ["SYNC_PORT"] = str(port)
    os.environ["STORAGE_PATH"] = storage_dir
    os.environ["SYNC_TOKEN"] = "test-sync-token"

    # Import the app here to ensure it picks up the environment variables
    from trosyn_sync.main import app
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")

# --- Test Setup: Fixture for Nodes and Storage ---
@pytest.fixture(scope="module")
def setup_nodes():
    """Sets up two nodes, each with its own temporary storage directory."""
    node1_port = 8004  # Using a different port to avoid conflicts
    node1_dir = tempfile.mkdtemp(prefix="node1_")

    node2_port = 8005
    node2_dir = tempfile.mkdtemp(prefix="node2_")

    node1_id = f"node-1-{uuid.uuid4()}"
    node2_id = f"node-2-{uuid.uuid4()}"

    # Create initial documents
    doc1 = Document(id="doc1", version=1, content="Content from node 1")
    with open(Path(node1_dir) / "doc1.json", "w") as f:
        f.write(doc1.model_dump_json())

    doc2 = Document(id="doc2", version=1, content="Content from node 2")
    with open(Path(node2_dir) / "doc2.json", "w") as f:
        f.write(doc2.model_dump_json())

    # Start server processes with unique IDs
    p1 = Process(target=run_server, args=(node1_id, node1_port, node1_dir))
    p2 = Process(target=run_server, args=(node2_id, node2_port, node2_dir))
    p1.start()
    p2.start()

    # Give servers time to start, discover, and perform one sync cycle
    time.sleep(15)

    yield (node1_dir, node2_dir)

    # Teardown: stop servers and clean up directories
    p1.terminate()
    p2.terminate()
    p1.join()
    p2.join()
    shutil.rmtree(node1_dir)
    shutil.rmtree(node2_dir)

# --- Test Case: End-to-End Synchronization ---
@pytest.mark.integration
def test_e2e_document_sync(setup_nodes):
    """Tests if two nodes can discover each other and synchronize documents using file-based storage."""
    node1_dir, node2_dir = setup_nodes

    # Verify Node 1 has both documents
    node1_files = {p.name for p in Path(node1_dir).iterdir()}
    assert "doc1.json" in node1_files, "Node 1 should have its own document"
    assert "doc2.json" in node1_files, "Node 1 should have synced document from Node 2"

    # Verify Node 2 has both documents
    node2_files = {p.name for p in Path(node2_dir).iterdir()}
    assert "doc2.json" in node2_files, "Node 2 should have its own document"
    assert "doc1.json" in node2_files, "Node 2 should have synced document from Node 1"

    # Verify content of synced file
    with open(Path(node1_dir) / "doc2.json", "r") as f:
        synced_doc2 = Document.parse_raw(f.read())
        assert synced_doc2.content == "Content from node 2"

    print("\nE2E Sync Test Passed: Both nodes successfully synchronized documents.")
