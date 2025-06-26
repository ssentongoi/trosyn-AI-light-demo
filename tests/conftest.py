"""
Pytest configuration and fixtures for Trosyn Sync tests.
"""
import asyncio
import os
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
        DATABASE_URL = TEST_DB_URL
        STORAGE_ROOT = temp_dir / "storage"
        DOCUMENTS_DIR = STORAGE_ROOT / "documents"
        VERSIONS_DIR = STORAGE_ROOT / "versions"
        TMP_DIR = STORAGE_ROOT / "tmp"
        NODE_ID = "test-node"
        NODE_TYPE = "TROSYSN_TEST_NODE"
        DISCOVERY_ENABLED = False
    
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
    connection = engine.connect()
    transaction = connection.begin()
    session = SessionLocal(bind=connection)
    
    # Begin a nested transaction (using SAVEPOINT).
    nested = connection.begin_nested()
    
    # If the application code calls session.commit, it will end the nested
    # transaction. Need to start a new one when that happens.
    @event.listens_for(session, 'after_transaction_end')
    def end_savepoint(session, transaction):
        nonlocal nested
        if not nested.is_active:
            nested = connection.begin_nested()
    
    yield session
    
    # Cleanup
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client for the FastAPI application."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    # Override the database dependency
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    # Clean up overrides
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def storage_service(mock_settings, db_session):
    """Create a storage service with test settings."""
    return StorageService()


@pytest.fixture(scope="function")
def test_document(db_session, storage_service):
    """Create a test document in the database."""
    from src.trosyn_sync.models.document import Document, DocumentVersion
    
    # Create a test file
    test_content = b"Test document content"
    test_file = storage_service.TMP_DIR / "test_doc.txt"
    with open(test_file, "wb") as f:
        f.write(test_content)
    
    # Create document in database
    doc = Document(
        title="Test Document",
        mime_type="text/plain",
        file_extension=".txt",
        size_bytes=len(test_content),
        metadata_={"test": True}
    )
    db_session.add(doc)
    db_session.flush()
    
    # Create version
    version = DocumentVersion(
        document_id=doc.id,
        version_number=1,
        version_hash=hashlib.sha256(test_content).hexdigest(),
        size_bytes=len(test_content),
        storage_path=str(test_file),
        mime_type="text/plain",
        is_encrypted=False,
        created_by="test"
    )
    db_session.add(version)
    db_session.flush()
    
    # Update document with current version
    doc.current_version_id = version.id
    db_session.commit()
    
    return doc
