"""
Pytest configuration and fixtures for Trosyn Sync tests.
"""
import asyncio
import os
from sqlalchemy import event
import shutil
import tempfile
from pathlib import Path
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.trosyn_sync.main import app
from src.trosyn_sync.config import Settings
from src.trosyn_sync.db import Base, SessionLocal, engine, init_db
from src.trosyn_sync.models.base import get_db
from src.trosyn_sync.services.storage import StorageService
from unittest.mock import patch, MagicMock

# Test settings
TEST_DB_URL = "sqlite:///:memory:"
TEST_STORAGE_ROOT = "test_storage"


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def test_settings() -> Settings:
    """Override settings for testing."""
    # Create a temporary directory for test storage
    temp_dir = Path(tempfile.mkdtemp(prefix="trosyn_test_"))
    
    class TestSettings(Settings):
        # Override settings with proper type annotations
        DATABASE_URL: str = TEST_DB_URL
        STORAGE_ROOT: Path = temp_dir / "storage"
        DOCUMENTS_DIR: Path = STORAGE_ROOT / "documents"
        VERSIONS_DIR: Path = STORAGE_ROOT / "versions"
        TMP_DIR: Path = STORAGE_ROOT / "tmp"
        NODE_ID: str = "test-node"
        NODE_TYPE: str = "TROSYSN_TEST_NODE"
        DISCOVERY_ENABLED: bool = False
        
        # Explicitly define model config to avoid Pydantic v2 warnings
        model_config = {
            "extra": "ignore",
            "arbitrary_types_allowed": True,
            "validate_assignment": True
        }
    
    # Apply test settings
    settings = TestSettings()
    
    # Ensure clean up after tests
    def cleanup():
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
    
    # Register cleanup
    import atexit
    atexit.register(cleanup)
    
    return settings


@pytest.fixture(scope="function")
def mock_settings(monkeypatch, test_settings):
    """Patch settings for testing."""
    # Patch settings
    monkeypatch.setattr("src.trosyn_sync.config.settings", test_settings)
    
    # Recreate database tables
    Base.metadata.create_all(bind=engine)
    
    # Create storage directories
    test_settings.STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
    test_settings.DOCUMENTS_DIR.mkdir(exist_ok=True)
    test_settings.VERSIONS_DIR.mkdir(exist_ok=True)
    test_settings.TMP_DIR.mkdir(exist_ok=True)
    
    return test_settings


@pytest.fixture(scope="function")
def db_session(mock_settings) -> Generator[Session, None, None]:
    """Create a clean database session for each test."""
    # Clear any existing sessions
    SessionLocal.remove()
    
    # Create a new connection and transaction
    connection = engine.connect()
    transaction = connection.begin()
    
    # Create a session bound to this connection
    session = SessionLocal(bind=connection)
    
    # Begin a nested transaction (using SAVEPOINT)
    nested = connection.begin_nested()
    
    # If the application code calls session.commit, it will end the nested
    # transaction. Need to start a new one when that happens.
    @event.listens_for(session, 'after_transaction_end')
    def end_savepoint(session, transaction_inner):
        nonlocal nested
        if not nested.is_active and not connection.in_nested_transaction():
            nested = connection.begin_nested()
    
    yield session
    
    # Cleanup
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client for the FastAPI application."""
    from fastapi.testclient import TestClient
    
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    # Store original overrides
    original_overrides = {}

    try:
        # Override the database dependency
        if get_db in app.dependency_overrides:
            original_overrides[get_db] = app.dependency_overrides[get_db]
        app.dependency_overrides[get_db] = override_get_db

        # Create a new test client for each test
        with TestClient(app) as test_client:
            yield test_client
    finally:
        # Restore original overrides
        for dep, impl in original_overrides.items():
            app.dependency_overrides[dep] = impl
        app.dependency_overrides.update(original_overrides)


@pytest.fixture(scope="function")
def storage_service(mock_settings, db_session):
    """Create a storage service with test settings."""
    return StorageService()


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
def test_document(db_session, storage_service):
    """Create a test document in the database."""
    from src.trosyn_sync.models.document import Document, DocumentVersion, DocumentChunk, ChunkType
    
    # Create a test document
    doc = Document(
        id=str(uuid4()),
        filename="test_document.txt",
        file_type="text/plain",
        size=1024,
        owner_id="test_user",
        company_id="test_company"
    )
    db_session.add(doc)
    db_session.flush()
    
    # Create a document version
    version = DocumentVersion(
        id=str(uuid4()),
        document_id=doc.id,
        version=1,
        storage_path=f"documents/{doc.id}/v1",
        size=1024,
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(version)
    db_session.flush()
    
    # Create some test chunks
    chunks = [
        DocumentChunk(
            id=str(uuid4()),
            document_id=doc.id,
            version_id=version.id,
            chunk_index=i,
            chunk_type=ChunkType.PARAGRAPH,
            text=f"Test chunk {i}",
            embedding=[0.1] * 384,  # Mock embedding
            metadata={"page": i + 1}
        )
        for i in range(3)
    ]
    db_session.add_all(chunks)
    db_session.commit()
    
    # Create the document in the storage service
    doc_path = storage_service.documents_dir / doc.id
    doc_path.mkdir(parents=True, exist_ok=True)
    (doc_path / "v1").mkdir()
    
    return doc
