"""Tests for simple client-server communication without authentication."""

import asyncio
import logging
import uuid
import time
import struct
import pytest
from typing import Optional, Dict, Any

from trosyn_sync.services.lan_sync.protocol import Message, MessageType, ProtocolHandler
from trosyn_sync.services.lan_sync.tcp_client import TCPSyncClient
from trosyn_sync.services.lan_sync.tcp_server import TCPSyncServer
from tests.lan_sync.conftest import TEST_NODE_ID, TEST_NODE_NAME, TEST_SECRET_KEY

logger = logging.getLogger(__name__)


@pytest.fixture
async def simple_test_server(event_loop, test_config, protocol_handler):
    """Create a test server with authentication disabled."""
    # Override server to skip authentication checks
    class SimpleTestServer(TCPSyncServer):
        async def _handle_client(self, reader, writer):
            # Generate random client ID
            client_id = str(uuid.uuid4())
            # Get client address
            client_addr = writer.get_extra_info('peername')
            # Skip authentication check entirely
            self.clients[client_id] = {
                'reader': reader,
                'writer': writer,
                'authenticated': True,  # Pre-authenticate
                'auth_data': {'user_id': 'test-user'},
                'last_seen': time.time(),
                'addr': client_addr,
                'ssl_enabled': False
            }
            
            logger.info(f"[SIMPLE_SERVER] Pre-authenticated client {client_id} connected")
            
            # Continue with normal processing, similar to the original TCPSyncServer._handle_client
            try:
                while self.running:
                    # Read message length (4 bytes)
                    header = await reader.readexactly(4)
                    if not header:
                        break # Connection closed cleanly by peer
                    
                    msg_length = struct.unpack('>I', header)[0]
                    
                    # Read message data
                    data = await reader.readexactly(msg_length)
                    
                    # Process the message with enhanced error logging
                    try:
                        logger.info(f"[SIMPLE_SERVER] Processing message from {client_id}")
                        logger.debug(f"[SIMPLE_SERVER] Message data (hex): {data.hex()[:50]}...")
                        await self._process_message(data, client_id)
                    except Exception as e:
                        logger.exception(f"[SIMPLE_SERVER] DETAILED ERROR in _process_message: {e}")
                        # Still need to send an error response to the client
                        try:
                            error_msg = self.handler.create_message(
                                MessageType.ERROR,
                                {"error": f"Server error: {str(e)}", "code": "server_error"}
                            )
                            await self._send_message(error_msg, client_id)
                        except Exception as nested_e:
                            logger.error(f"Failed to send error message: {nested_e}")
                        raise
                    
            except (asyncio.IncompleteReadError, ConnectionResetError) as e:
                logger.debug(f"Client {client_id} disconnected: {e}")
            except Exception as e:
                logger.error(f"Error handling client {client_id}: {e}", exc_info=True)
            finally:
                # Clean up connection
                writer.close()
                try:
                    await writer.wait_closed()
                except Exception as e:
                    logger.warning(f"Error closing writer for {client_id}: {e}")
                if client_id in self.clients:
                    del self.clients[client_id]
                logger.info(f"Client {client_id} connection closed")

    # Create and start server
    server = SimpleTestServer(
        config=test_config,
        protocol_handler=protocol_handler,
        auth_middleware=None,  # No auth middleware needed
        require_auth=False  # Disable authentication requirement
    )
    
    await server.start()
    await asyncio.sleep(0.1)  # Allow server to start properly
    yield server
    await server.stop()


@pytest.fixture
async def simple_test_client(event_loop, test_config, protocol_handler):
    """Create a test TCP client with authentication disabled."""
    # Create a special test handler with nonce checking disabled for testing
    class TestProtocolHandler(ProtocolHandler):
        def validate_message(self, message, check_signature=True, check_replay=False):
            # Override to disable replay attack detection in tests
            return super().validate_message(message, check_signature, check_replay=False)
    
    test_handler = TestProtocolHandler(
        node_id=TEST_NODE_ID,
        node_name=TEST_NODE_NAME,
        secret_key=TEST_SECRET_KEY
    )
    
    # Create a client that doesn't require authentication
    client = TCPSyncClient(
        config=test_config,
        handler=test_handler,  # Use test handler that disables nonce checking
        auth_callback=None,  # No auth callback needed
        auto_reconnect=False,
        require_auth=False  # Disable authentication requirement
    )
    
    # Connect but don't authenticate
    await client.connect('127.0.0.1', test_config.sync_port)
    # Force set the connected event since we're bypassing authentication
    client._connected_event.set()
    
    yield client
    
    # Clean up
    await client.disconnect()


class TestSimpleCommunication:
    """Tests for basic client-server communication without authentication."""

    @pytest.mark.asyncio
    async def test_basic_communication(self, simple_test_server, simple_test_client):
        """Test that basic communication works without authentication."""
        # Send a simple message from client to server
        test_message = "Hello, server!"
        test_payload = {"message": test_message}
        
        # Setup a handler for the test message
        received_messages = []
        
        # Use register_handler instead of message_handler and use the correct parameter signature
        @simple_test_server.register_handler(MessageType.SYNC_DATA)
        async def handle_test_message(message, client_id):
            logger.info(f"Server received test message: {message.payload}")
            received_messages.append(message)
            # Send acknowledgment back
            response = simple_test_server.handler.create_message(
                MessageType.SYNC_ACK,
                {"status": "received", "original_message": test_message},
                request_id=message.message_id
            )
            await simple_test_server._send_message(response, client_id)
        
        # Create a proper message object first instead of passing MessageType directly
        request_message = simple_test_client.handler.create_message(
            message_type=MessageType.SYNC_DATA,
            payload=test_payload
        )
        
        # Send the message object
        response = await simple_test_client.send_message(request_message)
        
        # Wait for processing
        await asyncio.sleep(0.5)
        
        # Check that message was received by server
        assert len(received_messages) > 0, "Server did not receive the message"
        assert received_messages[0].payload.get("message") == test_message
        
        # Check client received acknowledgment
        assert response is not None, "No response received from server"
        assert response.payload.get("status") == "received"
        assert response.payload.get("original_message") == test_message
