"""
Tests for secure messaging functionality in Trosyn Sync.

These tests verify the security features of the TCP client and server,
including message signing, validation, and replay attack prevention.
"""
import asyncio
import json
import logging
import os
import socket
import pytest
import time
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch, AsyncMock

import pytest_asyncio

from trosyn_sync.services.lan_sync.protocol import (
    Message, 
    MessageType, 
    ProtocolHandler, 
    MESSAGE_TTL
)
from trosyn_sync.services.lan_sync.tcp_client import TCPSyncClient
from trosyn_sync.services.lan_sync.tcp_server import TCPSyncServer
from trosyn_sync.services.lan_sync.config import LANConfig

# Enable debug logging for tests
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Test configuration
TEST_SECRET = b"test_secret_key_12345678901234567890"
TEST_PORT = 0  # Let OS choose an available port
TEST_NODE_ID = "test-node-123"
TEST_NODE_NAME = "Test Node"
TEST_USER_ID = "test-user-123"

@pytest.fixture
def protocol_handler():
    """Create a protocol handler with test secret key."""
    return ProtocolHandler(
        node_id=TEST_NODE_ID,
        node_name=TEST_NODE_NAME,
        secret_key=TEST_SECRET
    )

@pytest.fixture
def mock_auth_middleware():
    """Create a mock auth middleware that accepts any credentials."""
    async def auth_middleware(message):
        return True, {"user_id": TEST_USER_ID, "permissions": ["sync"]}
    return auth_middleware

@pytest.fixture
def unused_tcp_port():
    """Return an unused TCP port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

@pytest.fixture
def lan_config(unused_tcp_port):
    """Create a LAN config with test settings."""
    config = LANConfig()
    config.sync_port = unused_tcp_port
    config.node_id = TEST_NODE_ID
    config.node_name = TEST_NODE_NAME
    return config

@pytest.fixture
def unused_port():
    """Find an unused port for testing."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        return s.getsockname()[1]

@pytest.fixture
def server_config(unused_port):
    """Create a server config with a random port and SSL disabled for tests."""
    config = LANConfig()
    config.sync_port = unused_port
    config.use_ssl = False  # Disable SSL for testing
    config.node_id = f"test-server-{unused_port}"
    config.node_name = f"Test Server {unused_port}"
    return config

@pytest.fixture
def client_config(server_config):
    """Create a client config that points to the server."""
    return server_config

@pytest.fixture
async def tcp_server(server_config):
    """Create and start a TCP server for testing."""
    handler = ProtocolHandler(
        node_id=server_config.node_id,
        node_name=server_config.node_name,
        secret_key=TEST_SECRET
    )

    async def mock_auth_middleware(message):
        return True, {"user_id": "test_user", "permissions": ["sync"]}

    server = TCPSyncServer(
        config=server_config,
        handler=handler,
        auth_middleware=mock_auth_middleware,
        require_auth=True
    )

    await server.start()
    yield server
    await server.stop()

@pytest.fixture
async def tcp_client(client_config, tcp_server):
    """Create and connect a TCP client to the test server."""
    # Create a protocol handler with the same secret as the server
    handler = ProtocolHandler(
        node_id=f"test-client-{client_config.sync_port}",
        node_name="Test Client",
        secret_key=TEST_SECRET
    )
    
    # Create a mock auth callback
    async def mock_auth_callback():
        return {"user_id": TEST_USER_ID, "token": "test-token"}
    
    # Create the client
    client = TCPSyncClient(
        config=client_config,
        handler=handler,
        auth_callback=mock_auth_callback,
        auto_reconnect=False
    )
    
    # Connect to the server with retries
    max_retries = 3
    last_error = None
    
    for attempt in range(max_retries):
        try:
            await client.connect(host="127.0.0.1", port=client_config.sync_port)
            break
        except (ConnectionRefusedError, OSError) as e:
            last_error = e
            if attempt == max_retries - 1:
                raise ConnectionError(f"Failed to connect after {max_retries} attempts") from e
            await asyncio.sleep(0.1 * (attempt + 1))  # Exponential backoff
    
    try:
        yield client
    finally:
        # Cleanup
        if client.connected:
            await client.disconnect()

@pytest.mark.asyncio
async def test_message_signing_and_validation(protocol_handler):
    """Test that message signing and validation works correctly."""
    # Create a test message
    test_data = {"test": "data", "timestamp": int(time.time())}
    message = protocol_handler.create_message(
        MessageType.SYNC_DATA,
        test_data
    )
    
    # Sign the message
    message.sign(protocol_handler.secret_key)
    
    # Verify the signature
    is_valid, reason = protocol_handler.validate_message(message)
    assert is_valid, f"Message validation failed: {reason}"
    
    # Tamper with the message
    original_signature = message.signature
    message.payload["tampered"] = True
    
    # Verify the signature fails
    is_valid, reason = protocol_handler.validate_message(message)
    assert not is_valid, "Tampered message should be invalid"
    assert any(keyword in reason.lower() for keyword in ["signature", "replay"]), \
        f"Should detect signature mismatch or replay attack, got: {reason}"
    
    # Create a new message for the wrong key test
    message2 = protocol_handler.create_message(
        MessageType.SYNC_DATA,
        test_data
    )
    message2.sign(b"wrong_secret_key_1234567890")
    
    is_valid, reason = protocol_handler.validate_message(message2)
    assert not is_valid, "Message with wrong signature should be invalid"
    assert any(keyword in reason.lower() for keyword in ["signature", "replay"]), \
        f"Should detect invalid signature or replay attack, got: {reason}"

@pytest.mark.asyncio
async def test_replay_attack_prevention(protocol_handler):
    """Test that replay attacks are prevented using nonces."""
    # Create and sign a message
    message = protocol_handler.create_message(
        MessageType.SYNC_DATA,
        {"data": "test"}
    )
    message.sign(protocol_handler.secret_key)
    
    # First validation should succeed
    is_valid, reason = protocol_handler.validate_message(message)
    assert is_valid, f"First validation failed: {reason}"
    
    # Second validation with same nonce should fail
    is_valid, reason = protocol_handler.validate_message(message)
    assert not is_valid, "Replay attack not detected"
    assert "replay" in reason.lower(), f"Should detect replay attack, got: {reason}"

@pytest.mark.asyncio
async def test_message_expiration(protocol_handler):
    """Test that expired messages are rejected."""
    # Create a test message
    message = protocol_handler.create_message(
        MessageType.SYNC_DATA,
        {"data": "test"}
    )
    message.sign(protocol_handler.secret_key)
    
    # Should be valid initially
    is_valid, reason = protocol_handler.validate_message(message)
    assert is_valid, f"Message should be valid initially: {reason}"
    
    # Create a message with an old timestamp
    old_timestamp = (datetime.utcnow() - timedelta(seconds=MESSAGE_TTL + 1)).isoformat()
    message.timestamp = old_timestamp
    
    # Re-sign with the old timestamp
    message.sign(protocol_handler.secret_key)
    
    # Should be invalid due to old timestamp
    is_valid, reason = protocol_handler.validate_message(message)
    assert not is_valid, "Expired message should be rejected"
    assert "expired" in reason.lower(), f"Should detect expired message, got: {reason}"

@pytest.mark.asyncio
async def test_secure_communication(tcp_client, tcp_server, protocol_handler):
    """Test secure end-to-end communication between client and server."""
    # Mock the server's message handler
    received_messages = []
    handler_called = asyncio.Event()

    async def mock_handler(message, client_id):
        nonlocal received_messages
        received_messages.append((message, client_id))

        # Create and send a response, echoing the request_id
        response_payload = {
            "status": "received",
            "original_id": message.message_id
        }
        if 'request_id' in message.payload:
            response_payload['request_id'] = message.payload['request_id']

        response = protocol_handler.create_message(
            MessageType.SYNC_ACK,
            response_payload
        )
        await tcp_server._send_message(response, client_id)
        handler_called.set()

    # Replace the default handler for SYNC_DATA
    tcp_server.message_handlers[MessageType.SYNC_DATA] = mock_handler
    
    # Send a secure message from client to server
    test_data = {"test": "secure data", "timestamp": int(time.time())}
    response = await tcp_client.send_message(
        protocol_handler.create_message(
            MessageType.SYNC_DATA,
            test_data
        ),
        wait_for_response=True
    )
    
    # Verify the response
    assert response is not None, "No response received"
    assert response.message_type == MessageType.SYNC_ACK, "Unexpected response type"
    assert response.payload.get("status") == "received", "Unexpected status in response"
    
    # Wait for the handler to be called
    await asyncio.wait_for(handler_called.wait(), timeout=2)

    # Verify the server received the message
    assert len(received_messages) == 1, "Message not received by server"
    received_message, _ = received_messages[0]
    assert received_message.payload == test_data, "Message data corrupted"
    
    # Verify the message was properly signed and validated
    # Note: We re-validate here for the test, but the server already did it.
    is_valid, reason = protocol_handler.validate_message(received_message)
    assert is_valid, f"Message validation failed: {reason}"

@pytest.mark.asyncio
async def test_unauthenticated_access(client_config, tcp_server, protocol_handler):
    """Test that unauthenticated access to protected endpoints is denied."""
    # Create a client that does NOT authenticate
    unauth_client = TCPSyncClient(
        config=client_config,
        handler=protocol_handler,
        auth_callback=None,  # Explicitly disable auth
        auto_reconnect=False
    )
    await unauth_client.connect(host="127.0.0.1", port=client_config.sync_port)

    try:
        # Try to access a protected endpoint without authentication
        with pytest.raises(Exception) as exc_info:
            await unauth_client.send_message(
                protocol_handler.create_message(
                    MessageType.SYNC_REQUEST,
                    {"data": "test"}
                ),
                wait_for_response=True
            )
        
        assert "Authentication required" in str(exc_info.value), "Should receive 'Authentication required' error"
    finally:
        await unauth_client.disconnect()

@pytest.mark.asyncio
async def test_message_integrity(tcp_client, tcp_server, protocol_handler):
    """Test that message integrity is maintained during transmission."""
    # Mock the server's message handler
    received_messages = []
    
    async def mock_handler(message, client_id):
        nonlocal received_messages
        received_messages.append((message, client_id))
    
    tcp_server.message_handlers[MessageType.SYNC_DATA] = mock_handler
    
    # Create a large test message
    test_data = {
        "large_data": "a" * 10000,  # 10KB of data
        "timestamp": int(time.time())
    }
    
    # Send the message
    await tcp_client.send_message(
        protocol_handler.create_message(
            MessageType.SYNC_DATA,
            test_data
        )
    )
    
    # Verify the message was received intact
    await asyncio.sleep(0.1)  # Give server time to process
    assert len(received_messages) == 1, "Message not received by server"
    
    received_message, _ = received_messages[0]
    assert received_message.payload == test_data, "Message data corrupted during transmission"
    
    # Verify the signature is still valid
    is_valid, reason = protocol_handler.validate_message(received_message)
    assert is_valid, f"Message validation failed: {reason}"
