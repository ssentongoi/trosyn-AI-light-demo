"""
Test fixtures for LAN sync tests.
"""
import asyncio
import os
import socket
import pytest
import tempfile
from pathlib import Path
from typing import Dict, Any, AsyncGenerator, Optional

from trosyn_sync.services.lan_sync.config import LANConfig
from trosyn_sync.services.lan_sync.protocol import ProtocolHandler, Message, MessageType
from trosyn_sync.services.lan_sync.tcp_server import TCPSyncServer
from trosyn_sync.services.lan_sync.tcp_client import TCPSyncClient
from trosyn_sync.services.lan_sync.security import SecurityManager

# Test configuration
TEST_NODE_ID = "test-node-1"
TEST_NODE_NAME = "Test Node"
TEST_SECRET_KEY = os.urandom(32)  # 256-bit key for testing

@pytest.fixture
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def temp_dir():
    """Create and return a temporary directory for test files."""
    with tempfile.TemporaryDirectory() as temp_dir:
        yield Path(temp_dir)

@pytest.fixture
def unused_port():
    """Return a port that is not currently in use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        return s.getsockname()[1]

@pytest.fixture
def test_config(unused_port):
    """Return a test configuration."""
    return LANConfig(
        node_id=TEST_NODE_ID,
        node_name=TEST_NODE_NAME,
        sync_port=unused_port,  # Use a random available port
        use_ssl=False,  # Disable SSL for faster tests
        require_authentication=True
    )

@pytest.fixture
def protocol_handler():
    """Return a protocol handler instance for testing."""
    return ProtocolHandler(node_id=TEST_NODE_ID, node_name=TEST_NODE_NAME, secret_key=TEST_SECRET_KEY)

@pytest.fixture
async def test_server(event_loop, test_config, protocol_handler):
    """Create and start a test TCP server."""
    # Create a simple auth middleware for testing
    async def auth_middleware(message: Message) -> tuple[bool, Optional[Dict[str, Any]]]:
        # Accept any non-empty token for testing
        if message.payload.get('token') == 'test-token':
            return True, {'user_id': 'test-user'}
        return False, None

    # Create and start server
    server = TCPSyncServer(
        config=test_config,
        handler=protocol_handler,
        auth_middleware=auth_middleware,
        require_auth=test_config.require_authentication
    )
    
    await server.start()
    yield server
    await server.stop()

@pytest.fixture
async def test_client(event_loop, test_config, protocol_handler):
    """Create and connect a test TCP client."""
    client = TCPSyncClient(
        config=test_config,
        handler=protocol_handler,
        auto_reconnect=False
    )
    
    # Connect to localhost
    await client.connect('127.0.0.1', test_config.sync_port)
    
    yield client
    
    # Cleanup
    await client.disconnect()

@pytest.fixture
def authenticated_test_client(test_client):
    """Return an authenticated test client."""
    async def _authenticated_client():
        # Authenticate the client
        auth_message = test_client.handler.create_message(
            MessageType.AUTH_REQUEST,
            {'token': 'test-token'}
        )
        await test_client.send_message(auth_message, wait_for_response=True)
        return test_client
    
    return _authenticated_client()
