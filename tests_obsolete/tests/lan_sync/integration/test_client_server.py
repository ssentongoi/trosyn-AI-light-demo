"""
Integration tests for TCP client and server communication.
"""
import asyncio
import pytest
from unittest.mock import patch, MagicMock

from trosyn_sync.services.lan_sync.protocol import Message, MessageType

# Test data
TEST_PAYLOAD = {"key": "value", "nested": {"a": 1, "b": 2}}

class TestClientServerCommunication:
    """Test cases for client-server communication."""
    
    async def test_basic_communication(self, test_server, test_client):
        """Test basic message exchange between client and server."""
        # Create a test message
        test_msg = test_client.handler.create_message(
            MessageType.SYNC_REQUEST,
            TEST_PAYLOAD,
            sign=True
        )
        
        # Send message and wait for response
        response = await test_client.send_message(test_msg, wait_for_response=True)
        
        # Verify response
        assert response is not None
        assert response.message_type == MessageType.SYNC_RESPONSE
        assert response.payload["status"] == "received"
        assert response.payload.get("request_id") == test_msg.message_id
    
    async def test_authentication_flow(self, test_server, test_client):
        """Test the authentication flow."""
        # Try to access protected endpoint without auth
        test_msg = test_client.handler.create_message(
            MessageType.SYNC_REQUEST,
            {"data": "test"},
            sign=True
        )
        
        with pytest.raises(Exception):  # Should fail with auth error
            await test_client.send_message(test_msg, wait_for_response=True)
        
        # Authenticate
        auth_msg = test_client.handler.create_message(
            MessageType.AUTH_REQUEST,
            {"token": "test-token"},
            sign=True
        )
        auth_response = await test_client.send_message(auth_msg, wait_for_response=True)
        
        # Verify auth success
        assert auth_response.message_type == MessageType.AUTH_RESPONSE
        assert auth_response.payload.get("success") is True
        
        # Now try the protected endpoint again
        response = await test_client.send_message(test_msg, wait_for_response=True)
        assert response.message_type == MessageType.SYNC_RESPONSE
    
    async def test_invalid_auth(self, test_server, test_client):
        """Test authentication with invalid credentials."""
        auth_msg = test_client.handler.create_message(
            MessageType.AUTH_REQUEST,
            {"token": "wrong-token"},  # Invalid token
            sign=True
        )
        
        auth_response = await test_client.send_message(auth_msg, wait_for_response=True)
        
        # Should receive auth failure
        assert auth_response.message_type == MessageType.AUTH_RESPONSE
        assert auth_response.payload.get("success") is False
        assert "error" in auth_response.payload
    
    async def test_heartbeat(self, test_server, test_client, event_loop):
        """Test heartbeat mechanism."""
        # Authenticate first
        auth_msg = test_client.handler.create_message(
            MessageType.AUTH_REQUEST,
            {"token": "test-token"},
            sign=True
        )
        await test_client.send_message(auth_msg, wait_for_response=True)
        
        # Send heartbeat
        heartbeat_msg = test_client.handler.create_message(MessageType.HEARTBEAT, {})
        response = await test_client.send_message(heartbeat_msg, wait_for_response=True)
        
        # Should receive a heartbeat response
        assert response.message_type == MessageType.HEARTBEAT
        
        # Check that last_seen was updated
        client_id = next(iter(test_server.clients.keys()))
        last_seen = test_server.clients[client_id]['last_seen']
        current_time = event_loop.time()
        assert abs(current_time - last_seen) < 1  # Should be very recent


class TestErrorHandling:
    """Test error handling and edge cases."""
    
    async def test_invalid_message_format(self, test_server, test_client):
        """Test handling of invalid message format."""
        # Send invalid data
        test_client.writer.write(b'invalid-data')
        await test_client.writer.drain()
        
        # Should close the connection on invalid data
        with pytest.raises(ConnectionError):
            await test_client.reader.read(1024)
    
    async def test_unauthorized_access(self, test_server, test_client):
        """Test access to protected endpoints without authentication."""
        msg = test_client.handler.create_message(
            MessageType.SYNC_REQUEST,
            {"data": "test"},
            sign=True
        )
        
        # Should receive an error response
        response = await test_client.send_message(msg, wait_for_response=True)
        assert response.message_type == MessageType.ERROR
        assert "Authentication required" in response.payload.get("error", "")
    
    async def test_message_timeout(self, test_server, test_client):
        """Test message timeout when no response is received."""
        # Create a message with a very short timeout
        msg = test_client.handler.create_message(
            MessageType.SYNC_REQUEST,
            {"delay": 2},  # Tell server to delay response
            sign=True
        )
        
        # Send with a 1-second timeout
        with patch.object(test_client, 'pending_requests', {}) as mock_requests:
            # Mock the future to timeout immediately
            future = asyncio.Future()
            test_client.pending_requests[msg.message_id] = future
            
            with pytest.raises(asyncio.TimeoutError):
                await asyncio.wait_for(
                    test_client.send_message(msg, wait_for_response=True),
                    timeout=0.1  # Very short timeout for test
                )
    
    async def test_server_disconnect(self, test_server, test_client):
        """Test client behavior when server disconnects."""
        # Ensure client is connected
        assert test_client.connected

        # Start a task that will be interrupted by server disconnect
        send_task = asyncio.create_task(
            test_client.send_message(
                test_client.handler.create_message(MessageType.HEARTBEAT, {}),
                wait_for_response=True
            )
        )

        # Give it a moment to start
        await asyncio.sleep(0.1)

        # Stop the server
        await test_server.stop()

        # The send should fail with a connection error
        with pytest.raises(ConnectionError):
            await send_task
