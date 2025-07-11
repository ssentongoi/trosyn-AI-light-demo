"""
Test script for conflict resolution functionality.
This script tests various conflict scenarios in the sync engine.
"""
import os
import sys
import unittest
import uuid
import tempfile
import shutil
import asyncio
from pathlib import Path
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock, AsyncMock, call
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.pool import StaticPool
import httpx

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import models and services
from src.trosyn_sync.models import Base, Document, DocumentVersion, Node, SyncSession
from src.trosyn_sync.services.sync_engine import SyncEngine

class TestConflictResolution(unittest.IsolatedAsyncioTestCase):
    """Test suite for conflict resolution functionality."""
    
    @classmethod
    def setUpClass(cls):
        """Set up test environment once before all tests."""
        # Create a temporary directory for test databases
        cls.test_dir = Path(tempfile.mkdtemp(prefix="trosyn_test_"))
        cls.db_path = cls.test_dir / "test_trosyn.db"
        cls.database_url = f"sqlite:///{cls.db_path}"
        
        # Configure test engine with WAL mode for better concurrency
        cls.engine = create_engine(
            cls.database_url,
            connect_args={"check_same_thread": False, "timeout": 30},
            poolclass=StaticPool
        )
        
        # Enable foreign key support for SQLite
        @event.listens_for(cls.engine, 'connect')
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
        
        # Create all tables
        Base.metadata.create_all(bind=cls.engine)
    
    @classmethod
    def tearDownClass(cls):
        """Clean up test environment after all tests."""
        # Dispose the engine - this will close all connections
        cls.engine.dispose()
        
        # Remove the temporary directory
        if cls.test_dir.exists():
            shutil.rmtree(cls.test_dir, ignore_errors=True)
    
    def setUp(self):
        """Set up test data before each test method."""
        # Create a new session factory for this test
        self.SessionLocal = sessionmaker(
            bind=self.engine,
            autocommit=False,
            autoflush=False,
            expire_on_commit=False
        )
        
        # Start a new connection and transaction
        self.connection = self.engine.connect()
        self.transaction = self.connection.begin()
        
        # Create a new session
        self.session = self.SessionLocal(bind=self.connection)
        
        # Generate unique node IDs for each test
        self.node1_id = str(uuid.uuid4())
        self.node2_id = str(uuid.uuid4())
        
        # Set up test data
        self._setup_initial_data()
        self._setup_conflict_data()
        
        # Setup mock HTTP client first
        self._setup_mock_http_client()
        
        # Initialize sync engine for tests with the test session and mock HTTP client
        self.sync_engine = SyncEngine(
            db=self.session, 
            node_id=self.node1_id,
            http_client=self.mock_http_client
        )
        
        # Start the sync engine
        loop = asyncio.get_event_loop()
        loop.run_until_complete(self.sync_engine.start())
    
    def _setup_mock_http_client(self):
        """Set up the mock HTTP client with proper async support."""
        # Create a mock HTTP client with proper async support
        self.mock_http_client = AsyncMock()
        
        # Setup mock response for health check
        self.health_response = AsyncMock()
        self.health_response.status_code = 200
        self.health_response.json = AsyncMock(return_value={'status': 'healthy'})
        self.health_response.raise_for_status = AsyncMock()
        
        # Setup the mock client to return our response
        async def mock_get(*args, **kwargs):
            return self.health_response
            
        # Configure the mock client
        self.mock_http_client.get = mock_get
        self.mock_http_client.post = mock_get  # Reuse the same mock for POST requests
        self.mock_http_client.__aenter__ = AsyncMock(return_value=self.mock_http_client)
        self.mock_http_client.__aexit__ = AsyncMock(return_value=None)
        
        # Set up the mock client class
        self.mock_http_client_class = AsyncMock(return_value=self.mock_http_client)
        
        # Patch the HTTP client creation
        self._http_client_patcher = patch('httpx.AsyncClient', return_value=self.mock_http_client)
        self._http_client_patcher.start()
    
    async def asyncTearDown(self):
        """Clean up after each test method."""
        try:
            # Stop the sync engine if it's running
            if hasattr(self, 'sync_engine') and self.sync_engine._running:
                await self.sync_engine.stop()
        except Exception as e:
            print(f"Warning: Error stopping sync engine: {e}")
        
        # Stop the HTTP client patcher if it exists
        if hasattr(self, '_http_client_patcher'):
            self._http_client_patcher.stop()
        
        # Clean up the database session and connection
        try:
            if hasattr(self, 'session') and self.session.is_active:
                self.session.rollback()
                self.session.close()
        except Exception as e:
            print(f"Warning: Error cleaning up session: {e}")
        
        # Clean up the transaction if it exists
        try:
            if hasattr(self, 'transaction') and self.transaction.is_active:
                self.transaction.rollback()
        except Exception as e:
            print(f"Warning: Error cleaning up transaction: {e}")
        
        # Clean up the connection if it exists
        try:
            if hasattr(self, 'connection') and self.connection.closed == 0:
                self.connection.close()
        except Exception as e:
            print(f"Warning: Error cleaning up connection: {e}")
        
        # Clear any remaining mocks
        patch.stopall()
        
        # Clear any references to prevent memory leaks
        if hasattr(self, 'session'):
            del self.session
        if hasattr(self, 'transaction'):
            del self.transaction
        if hasattr(self, 'connection'):
            del self.connection
    
    def _setup_initial_data(self):
        """Setup nodes, a document, and its first version."""
        try:
            # Create or get node 1
            node1 = self.session.query(Node).filter(Node.node_id == self.node1_id).first()
            if not node1:
                node1 = Node(
                    node_id=self.node1_id,
                    node_type="TROSYSN_ADMIN_HUB",
                    display_name="Test Node 1",
                    hostname="localhost",
                    ip_address="127.0.0.1",
                    port=8000,
                    api_url="http://localhost:8000/api",
                    is_online=True,
                    is_trusted=True,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                self.session.add(node1)
                self.session.flush()
            
            # Create node 2
            node2 = self.session.query(Node).filter(Node.node_id == self.node2_id).first()
            if not node2:
                node2 = Node(
                    node_id=self.node2_id,
                    node_type="TROSYSN_NODE",
                    display_name="Test Node 2",
                    hostname="remotehost",
                    ip_address="127.0.0.2",
                    port=8001,
                    api_url="http://remotehost:8001/api",
                    is_online=True,
                    is_trusted=True,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                self.session.add(node2)
                self.session.flush()
            
            # Save node IDs for use in tests
            self.node1_db_id = node1.id
            self.node2_db_id = node2.id
            
            # Create the document with the valid node ID
            doc = Document(
                owner_node_id=node1.id,
                title="Test Document",
                mime_type="text/plain",
                file_extension=".txt",
                size_bytes=15,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            self.session.add(doc)
            self.session.flush()
            
            # Create a document version
            doc_version = DocumentVersion(
                document_id=doc.id,
                version_number=1,
                version_hash="abc123",
                size_bytes=15,
                storage_path="/test/path.txt",
                mime_type="text/plain",
                is_encrypted=False,
                created_by="test@example.com",
                created_at=datetime.utcnow()
            )
            self.session.add(doc_version)
            self.session.flush()
            
            # Update the document with the current version
            doc.current_version_id = doc_version.id
            self.session.commit()
            
            # Save IDs for use in tests
            self.doc_id = doc.id
            self.test_doc_db_id = doc.id  # For backward compatibility with existing tests
            self.doc_version_id = doc_version.id
            
        except Exception as e:
            self.session.rollback()
            self.fail(f"Failed to set up initial test data: {str(e)}")

    def _setup_conflict_data(self):
        """Create two conflicting versions of the test document."""
        try:
            # Create two conflicting versions of the document
            version_node1 = DocumentVersion(
                document_id=self.doc_id,  # Use the consistent attribute name
                version_number=2,
                version_hash="hash_v2_node1",
                size_bytes=20,
                storage_path=f"/docs/{self.doc_id}/v2_node1",  # Use the consistent attribute name
                mime_type="text/plain",
                created_by=self.node1_id,
                created_at=datetime.now(timezone.utc) - timedelta(minutes=5)
            )
            
            version_node2 = DocumentVersion(
                document_id=self.test_doc_db_id,
                version_number=2,
                version_hash="hash_v2_node2",
                size_bytes=22,
                storage_path=f"/docs/{self.doc_id}/v2_node2",  # Use the consistent attribute name
                mime_type="text/plain",
                created_by=self.node2_id,
                created_at=datetime.now(timezone.utc)
            )
            
            self.session.add_all([version_node1, version_node2])
            self.session.flush()
            
            # Store version IDs for easy access in tests
            self.version_node1_id = version_node1.id
            self.version_node2_id = version_node2.id
            
        except Exception as e:
            self.session.rollback()
            self.fail(f"Failed to set up conflict test data: {str(e)}")

    async def test_create_sync_session(self):
        """Test creating a sync session."""
        # Test creating a sync session
        session = SyncSession(
            id=str(uuid.uuid4()),
            source_node_id=str(self.node1_id),  # Use node1 as source
            target_node_id=str(self.node2_id),  # Use node2 as target
            status="in_progress",
            started_at=datetime.utcnow(),
            progress=0.0,
            estimated_time_remaining=60,  # 1 minute estimate
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        self.session.add(session)
        self.session.commit()
        
        # Verify the session was created
        db_session = self.session.get(SyncSession, session.id)
        self.assertIsNotNone(db_session, "Session should exist in database")
        self.assertEqual(db_session.source_node_id, str(self.node1_id))

def _setup_conflict_data(self):
    """Create two conflicting versions of the test document."""
    try:
        # Create two conflicting versions of the document
        version_node1 = DocumentVersion(
            document_id=self.doc_id,  # Use the consistent attribute name
            version_number=2,
            version_hash="hash_v2_node1",
            size_bytes=20,
            storage_path=f"/docs/{self.doc_id}/v2_node1",  # Use the consistent attribute name
            mime_type="text/plain",
            created_by=self.node1_id,
            created_at=datetime.now(timezone.utc) - timedelta(minutes=5)
        )
            
        version_node2 = DocumentVersion(
            document_id=self.test_doc_db_id,
            version_number=2,
            version_hash="hash_v2_node2",
            size_bytes=22,
            storage_path=f"/docs/{self.doc_id}/v2_node2",  # Use the consistent attribute name
            mime_type="text/plain",
            created_by=self.node2_id,
            created_at=datetime.now(timezone.utc)
        )
            
        self.session.add_all([version_node1, version_node2])
        self.session.flush()
            
        # Store version IDs for easy access in tests
        self.version_node1_id = version_node1.id
        self.version_node2_id = version_node2.id
            
    except Exception as e:
        self.session.rollback()
        self.fail(f"Failed to set up conflict test data: {str(e)}")

async def test_create_sync_session(self):
    """Test creating a sync session."""
    # Test creating a sync session
    session = SyncSession(
        id=str(uuid.uuid4()),
        source_node_id=str(self.node1_id),  # Use node1 as source
        target_node_id=str(self.node2_id),  # Use node2 as target
        status="in_progress",
        started_at=datetime.utcnow(),
        progress=0.0,
        estimated_time_remaining=60,  # 1 minute estimate
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    self.session.add(session)
    self.session.commit()
        
    # Verify the session was created
    db_session = self.session.get(SyncSession, session.id)
    self.assertIsNotNone(db_session, "Session should exist in database")
    self.assertEqual(db_session.source_node_id, str(self.node1_id))
    self.assertEqual(db_session.target_node_id, str(self.node2_id))
    self.assertEqual(db_session.status, "in_progress")

if __name__ == "__main__":
    unittest.main()
