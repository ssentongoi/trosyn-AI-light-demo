"""
Configuration for security tests.
"""
import pytest
import os
from pathlib import Path
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch

from trosyn_sync.main import app
from trosyn_sync.services.lan_sync.discovery import DiscoveryService
from trosyn_sync.config import Settings

# Test settings
TEST_DATA_DIR = "/tmp/trosyn_security_test"

@pytest.fixture(scope="module")
def test_settings():
    """Override settings for security tests."""
    # Create the test data directory before creating settings
    test_dir = Path(TEST_DATA_DIR)
    test_dir.mkdir(parents=True, exist_ok=True)
    
    # Create a test settings object
    settings = Settings(
        NODE_ID="test-node",
        NODE_NAME="Test Node",
        DATA_DIR=str(test_dir),  # Convert Path to string as Settings might expect
        SECRET_KEY="test-secret-key",
        SYNC_TOKEN="test-sync-token",
        ACCESS_TOKEN_EXPIRE_MINUTES=30,
        RATE_LIMIT_REQUESTS=5,
        RATE_LIMIT_WINDOW=60,
        ENVIRONMENT="test",
        ENABLE_CSP=True,
        ENABLE_HSTS=True,
        TRUSTED_ORIGINS=["http://testserver"]
    )
    
    # Store the Path object separately so tests can use it
    settings._data_dir_path = test_dir
    return settings

# Mock the discovery service
@pytest.fixture(autouse=True)
def mock_discovery_service():
    with patch('trosyn_sync.main.discovery_service') as mock_service:
        # Create an async function that returns a coroutine
        async def mock_start():
            return None
            
        # Assign the async function to the start method
        mock_service.start = mock_start
        mock_service.get_discovered_nodes.return_value = []
        
        # Create a mock for the stop method as well
        async def mock_stop():
            return None
            
        mock_service.stop = mock_stop
        yield mock_service

# Test client fixture
@pytest.fixture
def client(test_settings):
    """Create a test client with overridden settings."""
    # Apply test settings
    with patch('trosyn_sync.config.settings', test_settings):
        with TestClient(app) as test_client:
            # Data directory is already created in the test_settings fixture
            # Use the _data_dir_path attribute we added
            yield test_client
            
            # Clean up test data directory
            if test_settings._data_dir_path.exists():
                for file in test_settings._data_dir_path.iterdir():
                    if file.is_file():
                        file.unlink()
                    elif file.is_dir():
                        for subfile in file.glob('*'):
                            subfile.unlink()
                        file.rmdir()
                test_settings._data_dir_path.rmdir()
