"""
Tests for the refactored TCP client implementation.
"""
import asyncio
import json
import logging
import os
import ssl
import tempfile
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional, AsyncGenerator, Tuple
from unittest.mock import patch, MagicMock, AsyncMock

import pytest
import pytest_asyncio

from trosyn_sync.services.lan_sync.protocol import Message, MessageType, ProtocolHandler
from trosyn_sync.services.lan_sync.config import LANConfig
from trosyn_sync.services.lan_sync.tcp_server import TCPSyncServer
from trosyn_sync.services.lan_sync.security import security

# Import the refactored client
from trosyn_sync.services.lan_sync.tcp_client_refactored import TCPSyncClient as RefactoredTCPSyncClient

# Test configuration
TEST_PORT = 0  # Let OS choose an available port
TEST_NODE_ID = "test-node-123"
TEST_NODE_NAME = "Test Node"
TEST_USER_ID = "test-user-123"
TEST_SECRET = b"test_secret_key_12345678901234567890"

# Enable debug logging for tests
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Test fixtures
@pytest_asyncio.fixture
def test_config() -> LANConfig:
    """Create a test configuration."""
    config = LANConfig()
    config.node_id = TEST_NODE_ID
    config.node_name = TEST_NODE_NAME
    config.sync_port = TEST_PORT
    config.use_ssl = False  # Disable SSL for tests unless specifically testing it
    config.shared_secret = TEST_SECRET
    config.require_authentication = False  # Disable auth for basic tests
    return config

@pytest_asyncio.fixture
async def test_protocol_handler() -> ProtocolHandler:
    """Create a test protocol handler."""
    return ProtocolHandler(
        node_id=TEST_NODE_ID,
        node_name=TEST_NODE_NAME
    )

async def mock_auth_middleware(message: Message) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """A simple mock authentication middleware for tests."""
    logger.debug(f"mock_auth_middleware called with message type: {message.message_type}")
    if message.message_type == MessageType.AUTH_REQUEST:
        token = message.payload.get("token")
        if token:
            auth_data = {
                "token": token,
                "node_id": message.source.get("node_id") if message.source else None,
            }
            return True, auth_data
    return False, None


@pytest_asyncio.fixture
async def test_server(
    test_config: LANConfig,
    test_protocol_handler: ProtocolHandler,
) -> AsyncGenerator[TCPSyncServer, None]:
    """Create and start a test server with authentication middleware for testing."""
    # Create server with auth middleware
    server = TCPSyncServer(
        config=test_config,
        protocol_handler=test_protocol_handler,
        auth_middleware=mock_auth_middleware,
        require_auth=False,  # Don't require auth by default, individual tests can enable it
    )

    # Register a handler for a message type to ensure the decorator works as expected
    @server.message_handler(MessageType.HEARTBEAT)
    async def handle_heartbeat_test(message: Message, client_id: str):
        pass

    await server.start()

    try:
        yield server
    finally:
        # Cleanup
        await server.stop()

@pytest_asyncio.fixture
async def test_client(
    test_config: LANConfig,
    test_protocol_handler: ProtocolHandler,
    test_server: TCPSyncServer
) -> AsyncGenerator[RefactoredTCPSyncClient, None]:
    """Create a test client connected to the test server."""
    # Update config with actual server port
    test_config.sync_port = test_server.port
    
    # Create a test client
    client = RefactoredTCPSyncClient(
        config=test_config,
        handler=test_protocol_handler,
        auth_callback=None,  # Disable auth_callback
        auto_reconnect=False  # Disable auto-reconnect for tests
    )
    
    # Connect to the test server
    await client.connect("127.0.0.1", test_config.sync_port)
    
    # For non-authenticated tests, manually set the connected event
    # This is normally set after authentication, but our tests don't authenticate
    client._connected_event.set()
    
    yield client
    
    # Cleanup
    await client.disconnect()

# Test cases
@pytest.mark.asyncio
async def test_client_connection(
    test_client: RefactoredTCPSyncClient,
    test_server: TCPSyncServer
) -> None:
    """Test that the client can connect to the server."""
    assert test_client.connected
    assert not test_client.authenticated  # Not authenticated yet
    assert test_client.reader is not None
    assert test_client.writer is not None

@pytest.mark.asyncio
async def test_send_message(
    test_client: RefactoredTCPSyncClient,
    test_server: TCPSyncServer,
    test_protocol_handler: ProtocolHandler
) -> None:
    """Test sending a message from client to server."""
    # Ensure client is connected
    assert test_client.connected, "Client should be connected before test"
    
    # Create an event to track when the message is received
    message_received = asyncio.Event()
    
    # Create a mock handler for the server
    async def mock_handler(message: Message, client_id: str):
        logger.debug(f"Mock handler called with message: {message.message_type} from {client_id}")
        message_received.set()
    
    # Register the mock handler for HEARTBEAT messages using the decorator
    @test_server.message_handler(MessageType.HEARTBEAT)
    async def handle_heartbeat(message: Message, client_id: str):
        # Call our mock handler
        await mock_handler(message, client_id)
    
    # Wait a bit to ensure connection is stable
    await asyncio.sleep(0.5)
    
    # Create a test message
    message = Message(
        message_type=MessageType.HEARTBEAT,
        source={"node_id": test_client.config.node_id},
        payload={"status": "alive"}
    )
    
    # Send the message
    await test_client.send_message(message)
    
    # Wait for the message to be received with timeout
    try:
        await asyncio.wait_for(message_received.wait(), timeout=2.0)
    except asyncio.TimeoutError:
        pytest.fail("Timeout waiting for server to receive the message")
        
    # Verify the server still has our client connected
    assert len(test_server.clients) > 0, "Client disconnected during test"
    
    # Get client ID from server's clients dictionary
    client_id = next(iter(test_server.clients.keys()))
    
    # Verify client is still in server's client list
    assert client_id in test_server.clients, "Client not found in server's client list"
    
    # Double check client is still connected
    assert test_client.connected, "Client disconnected during test"

@pytest.mark.asyncio
async def test_receive_message(
    test_client: RefactoredTCPSyncClient,
    test_server: TCPSyncServer
) -> None:
    """Test receiving a message from the server."""
    # Setup a future to capture the received message
    received = asyncio.Future()
    
    # Register a test handler
    async def test_handler(message: Message) -> None:
        received.set_result(message)
    
    test_client.message_handlers[MessageType.HEARTBEAT] = test_handler
    
    # Send a message from the server to the client
    message = Message(
        message_type=MessageType.HEARTBEAT,
        source={"node_id": test_server.config.node_id, "node_name": test_server.config.node_name},
        payload={"status": "pong"}
    )
    
    # Send the message from the server to the client
    for client in test_server.clients:
        await test_server.send_message(client, message)
    
    # Wait for the message to be received or timeout
    try:
        received_message = await asyncio.wait_for(received, timeout=1.0)
        
        # Verify the message was received correctly
        assert received_message.message_type == MessageType.HEARTBEAT
        assert received_message.source == {
            "node_id": test_server.config.node_id,
            "node_name": test_server.config.node_name
        }
        assert received_message.payload["status"] == "pong"
        
    except asyncio.TimeoutError:
        pytest.fail("Timeout waiting for message")

@pytest.mark.asyncio
async def test_disconnect(
    test_client: RefactoredTCPSyncClient,
    test_server: TCPSyncServer
) -> None:
    """Test that the client can disconnect properly."""
    assert test_client.connected
    
    # Disconnect the client
    await test_client.disconnect()
    
    # Verify the client is disconnected
    assert not test_client.connected
    assert test_client.reader is None
    assert test_client.writer is None
    
    # Verify the server no longer has the client
    await asyncio.sleep(0.1)  # Give time for the server to process the disconnect
    assert len(test_server.clients) == 0

@pytest.mark.asyncio
async def test_reconnect(
    test_config: LANConfig,
    test_protocol_handler: ProtocolHandler,
    test_server: TCPSyncServer
) -> None:
    """Test that the client can reconnect after disconnection."""
    # Use a simplified approach that just tests basic reconnection
    
    # Disable authentication for this test
    test_server.require_auth = False
    
    # Create events to track connection states
    connected_event = asyncio.Event()
    message_received_event = asyncio.Event()
    
    # Register message handlers on the server
    @test_server.message_handler(MessageType.HEARTBEAT)
    async def handle_heartbeat(message: Message, client_id: str):
        logger.debug(f"Server received HEARTBEAT from client: {message.payload}")
        if message.payload.get("test") == "reconnect":
            message_received_event.set()
    
    # Create a basic client with no auto-reconnect (we'll handle reconnection manually)
    client = RefactoredTCPSyncClient(
        config=test_config,
        handler=test_protocol_handler,
        auth_callback=None,  # No auth
        auto_reconnect=False  # No auto-reconnect, we'll do it manually
    )
    
    # Test connection/reconnection steps
    try:
        # Initial connection
        logger.info(f"First connection attempt to server on port {test_server.port}...")
        await client.connect("127.0.0.1", test_server.port)
        
        # Verify connection success
        assert client.connected, "Initial connection failed"
        logger.info("Initial connection successful")
        
        # Set connected event for message sending
        client._connected_event.set()
        
        # Force disconnect
        logger.info("Forcing disconnect...")
        await client.disconnect()
        
        # Verify disconnect worked
        assert not client.connected, "Client should be disconnected"
        assert not client._connected_event.is_set(), "Connected event should be cleared"
        logger.info("Disconnect successful")
        
        # Let server process the disconnect
        await asyncio.sleep(0.5)
        
        # Direct reconnection (no reconnection logic, just connect again)
        logger.info(f"Reconnecting to server on port {test_server.port}...")
        await client.connect("127.0.0.1", test_server.port)
        
        # Verify reconnection success
        assert client.connected, "Reconnection failed"
        logger.info("Reconnection successful!")
        
        # Set connected event again since reconnection
        client._connected_event.set()
        
        # Send test message after reconnection
        logger.info("Sending test message after reconnection...")
        reconnect_message = Message(
            message_type=MessageType.HEARTBEAT,
            source={"node_id": client.config.node_id},
            payload={"test": "reconnect"}
        )
        
        await client.send_message(reconnect_message)
        
        # Wait for confirmation from server
        try:
            await asyncio.wait_for(message_received_event.wait(), timeout=3.0)
            logger.info("Server successfully received message after reconnection!")
        except asyncio.TimeoutError:
            pytest.fail("Server did not receive message after reconnection")
    
    finally:
        # Clean up
        try:
            if client.connected:
                await client.disconnect()
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
        await asyncio.sleep(0.2)  # Give time for cleanup

@pytest.mark.asyncio
async def test_message_validation(
    test_client: RefactoredTCPSyncClient,
    test_server: TCPSyncServer
) -> None:
    """Test that message validation works correctly."""
    from trosyn_sync.services.lan_sync.protocol import Message, MessageType
    
    # Test 1: Create a message with a valid message type string
    valid_message = Message(
        message_type='HEARTBEAT',  # This is a valid message type string
        payload={"test": "data"}
    )
    # The message_type should be a string in the Message instance
    assert valid_message.message_type == 'HEARTBEAT'
    
    # When converted to dict, message_type should be a string
    message_dict = valid_message.to_dict()
    assert isinstance(message_dict['message_type'], str)
    assert message_dict['message_type'] == 'HEARTBEAT'
    
    # When creating from dict, it should convert the string to MessageType enum
    from_dict_message = Message.from_dict(message_dict)
    assert isinstance(from_dict_message.message_type, MessageType)
    assert from_dict_message.message_type == MessageType.HEARTBEAT
    
    # Test 2: Create a message with a valid MessageType enum
    valid_enum_message = Message(
        message_type=MessageType.HEARTBEAT,
        payload={"test": "data"}
    )
    # The message_type should be a MessageType enum
    assert isinstance(valid_enum_message.message_type, MessageType)
    assert valid_enum_message.message_type == MessageType.HEARTBEAT
    
    # When converted to dict, message_type should be a string
    enum_dict = valid_enum_message.to_dict()
    assert isinstance(enum_dict['message_type'], str)
    assert enum_dict['message_type'] == 'HEARTBEAT'
    
    # Test 3: Create a message with an invalid message type string
    # The Message class doesn't validate message_type on instantiation
    invalid_message = Message(
        message_type='INVALID_TYPE',
        payload={"test": "data"}
    )
    assert invalid_message.message_type == 'INVALID_TYPE'
    
    # Converting to dict will keep the invalid type as is
    invalid_dict = invalid_message.to_dict()
    assert invalid_dict['message_type'] == 'INVALID_TYPE'
    
    # However, ProtocolHandler.validate_message will catch this
    # when checking the message type
    
    # Verify no messages were sent to the server during these tests
    # The test_server.clients is a dictionary where keys are client IDs and values are client info dicts
    assert len(test_server.clients) == 1  # Only the test client should be connected
    
    # Get the client info for the connected client
    client_info = next(iter(test_server.clients.values()))
    
    # We can verify the last_seen timestamp is recent as a basic check
    # that the client is still connected but no messages were processed
    loop = asyncio.get_event_loop()
    current_time = loop.time()
    last_seen = client_info['last_seen']
    time_since_last_seen = current_time - last_seen
    assert time_since_last_seen < 2, f"Expected last_seen to be recent, but it was {time_since_last_seen} seconds ago"

@pytest.mark.asyncio
async def test_connection_timeout(
    test_config: LANConfig,
    test_protocol_handler: ProtocolHandler
) -> None:
    """Test that connection attempts time out properly."""
    # Create a client with a very short timeout
    test_config.sync_port = 1  # Unlikely to be in use
    client = RefactoredTCPSyncClient(
        config=test_config,
        handler=test_protocol_handler,
        auto_reconnect=False
    )
    
    # Try to connect to an unreachable address with a short timeout
    with pytest.raises(ConnectionError):
        await client.connect("127.0.0.1", 1, timeout=0.1)
    
    # Verify the client is not connected
    assert not client.connected
    assert not client.authenticated
