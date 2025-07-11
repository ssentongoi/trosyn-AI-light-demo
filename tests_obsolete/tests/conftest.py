"""
Pytest configuration and fixtures for Trosyn Sync tests.
"""
import os
import tempfile
import logging
import sys
import shutil
from pathlib import Path
from typing import Generator, Any, Dict

import pytest
from fastapi.testclient import TestClient
from fastapi import FastAPI
import time
import uuid
from trosyn_sync.core.discovery import get_discovery_service, NodeInfo
from trosyn_sync.services.token_service import get_token_service

# Configure logging for tests
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stderr)
    ]
)

# Set log level for specific noisy loggers
logging.getLogger('asyncio').setLevel(logging.INFO)
logging.getLogger('urllib3').setLevel(logging.INFO)
logging.getLogger('httpx').setLevel(logging.INFO)
logging.getLogger('httpcore').setLevel(logging.INFO)

# Enable debug logging for our modules
for module in ['trosyn_sync.services.lan_sync']:
    logger = logging.getLogger(module)
    logger.setLevel(logging.DEBUG)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from unittest.mock import patch, MagicMock
from uuid import uuid4
from datetime import datetime, timezone

from trosyn_sync.main import app
from trosyn_sync.config import Settings
from trosyn_sync.db import Base, get_db
from trosyn_sync.models.document import Document, DocumentVersion
from trosyn_sync.models.node import Node
from trosyn_sync.services.storage import StorageService

# Setup Test Database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """
    Create all tables once per test session.
    """
    # Import all models to ensure they are registered with Base
    from trosyn_sync import models  # noqa
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)



def override_get_db():
    """Dependency override for getting a test database session."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Test settings
TEST_STORAGE_PATH = "/tmp/trosyn_test_storage"

@pytest.fixture(scope="function")
def authenticated_client(db_session: Session) -> Generator[TestClient, None, None]:
    """
    Yields a TestClient authenticated as a specific test node.

    This fixture creates a node in the database, mocks the authentication
    service, and ensures the app uses the same transactional DB session.
    """
    # 1. Override get_db to use the transactional session for this test
    def override_get_db_for_test():
        yield db_session

    original_db_override = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = override_get_db_for_test

    # 2. Create the test node in the database
    test_node_id = "test-auth-node-" + str(uuid.uuid4())
    db_node = Node(
        node_id=test_node_id,
        node_type="TROSYSN_DEPT_NODE",
        hostname="auth-testhost",
        ip_address="127.0.0.1",
        port=8000,
        is_trusted=True
    )
    db_session.add(db_node)
    db_session.commit()  # Commits to the transaction, not the DB

    # 3. Mock the authentication service
    class MockAuthService(AuthService):
        def verify_token(self, *args, **kwargs) -> TokenData:
            return TokenData(node_id=test_node_id, node_type="TROSYSN_DEPT_NODE")

    def override_get_auth_service():
        return MockAuthService()

    original_auth_override = app.dependency_overrides.get(get_auth_service)
    app.dependency_overrides[get_auth_service] = override_get_auth_service

    with TestClient(app) as client:
        client.headers["Authorization"] = "Bearer testtoken"
        yield client

    # 4. Cleanup: restore original dependencies.
    # The transaction rollback in db_session fixture handles DB cleanup.
    app.dependency_overrides.pop(get_auth_service, None)
    if original_auth_override:
        app.dependency_overrides[get_auth_service] = original_auth_override

    app.dependency_overrides.pop(get_db, None)
    if original_db_override:
        app.dependency_overrides[get_db] = original_db_override


@pytest.fixture(scope="session")
def test_settings() -> Settings:
    """Override settings for testing."""
    # Create a test settings object
    settings = Settings(
        NODE_ID="test-node",
        NODE_DISPLAY_NAME="Test Node",
        STORAGE_ROOT=TEST_STORAGE_PATH,
        SECRET_KEY="test-secret-key",
        ACCESS_TOKEN_EXPIRE_MINUTES=30
    )
    
    # Create storage directory if it doesn't exist
    os.makedirs(TEST_STORAGE_PATH, exist_ok=True)
    
    # Clean up function
    def cleanup():
        if os.path.exists(TEST_STORAGE_PATH):
            shutil.rmtree(TEST_STORAGE_PATH)
    
    import atexit
    atexit.register(cleanup)
    
    return settings


@pytest.fixture
def mock_settings(monkeypatch, test_settings):
    """Patch settings for testing."""
    # Apply test settings
    for key, value in test_settings.model_dump().items():
        monkeypatch.setattr(f"trosyn_sync.config.settings.{key}", value)
    
    return test_settings


from trosyn_sync.core.auth import AuthService, get_auth_service, TokenData




@pytest.fixture
def mock_llm_service():
    """Mock the LLM service for testing."""
    with patch("src.trosyn_sync.services.llm_service.LLMService") as mock_llm:
        # Mock embedding generation
        mock_llm.return_value.generate_embeddings.return_value = [0.1] * 384
        # Mock text generation
        mock_llm.return_value.generate_text.return_value = "Generated text response"
        yield mock_llm.return_value


@pytest.fixture
def mock_vector_store():
    """Mock the vector store for testing."""
    with patch("src.trosyn_sync.services.vector_store.VectorStore") as mock_vs:
        # Mock document addition
        mock_vs.return_value.add_documents.return_value = ["doc1", "doc2"]
        # Mock search
        mock_vs.return_value.search.return_value = [
            {"id": "doc1", "text": "Sample text", "score": 0.95, "metadata": {}}
        ]
        yield mock_vs.return_value


@pytest.fixture
def test_owner_node(db_session: Session) -> Node:
    """Creates a test node for ownership for general purpose."""
    node = db_session.query(Node).filter(Node.node_id == "test-owner-node").first()
    if not node:
        node = Node(
            node_id="test-owner-node",
            node_type="TROSYSN_DEPT_NODE",
            hostname="test-owner-host",
            ip_address="127.0.0.1",
            port=9001,
            is_trusted=True
        )
        db_session.add(node)
        db_session.commit()
        db_session.refresh(node)
    return node


@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """Provide a test database session that rolls back changes after each test."""
    connection = engine.connect()
    transaction = connection.begin()
    db = TestingSessionLocal(bind=connection)

    try:
        yield db
    finally:
        db.close()
        transaction.rollback()
        connection.close()


@pytest.fixture(scope="function")
def storage_service(tmp_path: Path) -> Generator[StorageService, None, None]:
    """
    Provides a StorageService instance configured with a temporary storage path.
    Cleans up the storage directory after the test.
    """
    storage_dir = tmp_path / "test_storage"
    storage_dir.mkdir(exist_ok=True, parents=True)
    service = StorageService(storage_root=storage_dir)
    yield service


@pytest.fixture
def test_document(db_session: Session, storage_service: StorageService, test_owner_node: Node) -> Document:
    """Create a test document in the database."""
    from trosyn_sync.models.document import Document, DocumentVersion
    import hashlib

    # Create a dummy file content
    file_content = b"This is a test document for Trosyn Sync."
    file_hash = hashlib.sha256(file_content).hexdigest()
    
    # Create a test document
    doc = Document(
        owner_node_id=test_owner_node.id,
        title="test_document.txt",
        mime_type="text/plain",
        file_extension="txt",
        size_bytes=len(file_content),
        metadata_={'source': 'test fixture'}
    )
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)
    
    # Create a document version
    version = DocumentVersion(
        document_id=doc.id,
        version_number=1,
        version_hash=file_hash,
        size_bytes=len(file_content),
        storage_path=f"{doc.id}/1",
        mime_type="text/plain",
        created_by="test_fixture"
    )
    db_session.add(version)
    
    # Update document's current version
    doc.current_version_id = version.id
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)
    db_session.refresh(version)
    
    # Create the document file in the test storage directory
    doc_path = storage_service.storage_path / str(doc.id)
    doc_path.mkdir(parents=True, exist_ok=True)
    version_path = doc_path / str(version.version_number)
    version_path.mkdir(exist_ok=True)
    with open(version_path / "content.bin", "wb") as f:
        f.write(file_content)
    
    return doc
