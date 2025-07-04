"""
Unit tests for the LAN sync protocol implementation.
"""
import pytest
import time
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from trosyn_sync.services.lan_sync.protocol import (
    Message, MessageType, ProtocolHandler, MESSAGE_TTL
)

# Test data
TEST_NODE_ID = "test-node-1"
TEST_NODE_NAME = "Test Node"
TEST_SECRET_KEY = b"test-secret-key-1234567890123456"  # 32 bytes

class TestMessage:
    """Test cases for the Message class."""
    
    def test_message_creation(self):
        """Test basic message creation."""
        msg = Message(
            message_type=MessageType.SYNC_REQUEST,
            payload={"key": "value"},
            message_id="test-123",
            source={"node_id": "source-node"},
            destination={"node_id": "dest-node"}
        )
        
        assert msg.message_type == MessageType.SYNC_REQUEST
        assert msg.payload == {"key": "value"}
        assert msg.message_id == "test-123"
        assert msg.source == {"node_id": "source-node"}
        assert msg.destination == {"node_id": "dest-node"}
        assert msg.signature is None
        
    def test_message_serialization(self):
        """Test message serialization and deserialization."""
        # Create a message
        original_msg = Message(
            message_type=MessageType.SYNC_REQUEST,
            payload={"key": "value"},
            source={"node_id": "source-node"}
        )
        
        # Serialize and deserialize
        data = original_msg.to_bytes()
        deserialized_msg = Message.from_bytes(data)
        
        # Check that the deserialized message matches the original
        assert deserialized_msg.message_type == original_msg.message_type
        assert deserialized_msg.payload == original_msg.payload
        assert deserialized_msg.message_id == original_msg.message_id
        assert deserialized_msg.source == original_msg.source
        
    def test_message_expiration(self):
        """Test message expiration logic."""
        # Create a message with current time
        msg = Message(
            message_type=MessageType.SYNC_REQUEST,
            payload={"test": "data"}
        )
        
        # Should not be expired with default TTL
        assert msg.is_expired() is False
        
        # Create a message with old timestamp (2x TTL in the past)
        old_timestamp = (datetime.utcnow() - timedelta(seconds=MESSAGE_TTL * 2)).isoformat()
        old_msg = Message(
            message_type=MessageType.SYNC_REQUEST,
            payload={"test": "old_data"},
            timestamp=old_timestamp
        )
        
        # Should be expired with default TTL
        assert old_msg.is_expired() is True
        
        # Test with custom TTL
        assert old_msg.is_expired(ttl=MESSAGE_TTL * 3) is False  # Within extended TTL
        assert old_msg.is_expired(ttl=1) is True  # Expired with very short TTL
        
    def test_message_signing(self):
        """Test message signing and verification."""
        # Create a message and sign it
        msg = Message(
            message_type=MessageType.SYNC_REQUEST,
            payload={"key": "value"}
        )
        
        # Sign the message
        msg.sign(TEST_SECRET_KEY)
        
        # Verify the signature
        assert msg.verify_signature(TEST_SECRET_KEY) is True
        
        # Tamper with the message and verify signature fails
        msg.payload["key"] = "modified"
        assert msg.verify_signature(TEST_SECRET_KEY) is False
        
        # Test with wrong key
        assert msg.verify_signature(b"wrong-secret-key") is False


class TestProtocolHandler:
    """Test cases for the ProtocolHandler class."""
    
    def test_create_message(self):
        """Test message creation with the protocol handler."""
        handler = ProtocolHandler(
            node_id=TEST_NODE_ID,
            node_name=TEST_NODE_NAME,
            secret_key=TEST_SECRET_KEY
        )
        
        # Create a message without signing
        msg = handler.create_message(
            MessageType.SYNC_REQUEST,
            {"key": "value"},
            sign=False
        )
        
        assert msg.message_type == MessageType.SYNC_REQUEST
        assert msg.payload == {"key": "value"}
        assert msg.signature is None
        
        # Create a signed message
        signed_msg = handler.create_message(
            MessageType.SYNC_REQUEST,
            {"key": "value"},
            sign=True
        )
        
        assert signed_msg.signature is not None
        assert signed_msg.verify_signature(TEST_SECRET_KEY) is True
        
    def test_validate_message_valid(self):
        """Test validation of a completely valid message."""
        handler = ProtocolHandler(
            node_id=TEST_NODE_ID,
            node_name=TEST_NODE_NAME,
            secret_key=TEST_SECRET_KEY
        )
        msg = handler.create_message(MessageType.SYNC_REQUEST, {"key": "value"}, sign=True)
        is_valid, reason = handler.validate_message(msg)
        assert is_valid is True
        assert reason == ""

    def test_validate_message_invalid_signature(self):
        """Test validation of a message with an invalid signature."""
        handler = ProtocolHandler(
            node_id=TEST_NODE_ID,
            node_name=TEST_NODE_NAME,
            secret_key=TEST_SECRET_KEY
        )
        msg = handler.create_message(MessageType.SYNC_REQUEST, {"key": "value"}, sign=True)
        msg.signature = "invalid-signature"
        is_valid, reason = handler.validate_message(msg)
        assert is_valid is False
        assert "signature" in reason.lower()

    def test_validate_message_expired(self):
        """Test validation of an expired message."""
        handler = ProtocolHandler(
            node_id=TEST_NODE_ID,
            node_name=TEST_NODE_NAME,
            secret_key=TEST_SECRET_KEY
        )
        old_timestamp = (datetime.utcnow() - timedelta(seconds=MESSAGE_TTL * 2)).isoformat()
        msg_expired = Message(
            message_type=MessageType.SYNC_REQUEST,
            payload={"key": "value"},
            timestamp=old_timestamp,
            source={"node_id": handler.node_id, "node_name": handler.node_name}
        )
        msg_expired.sign(TEST_SECRET_KEY)
        is_valid, reason = handler.validate_message(msg_expired)
        assert is_valid is False
        assert "expired" in reason.lower()
            
    def test_replay_attack_protection(self):
        """Test that the same message can't be processed twice."""
        handler = ProtocolHandler(
            node_id=TEST_NODE_ID,
            node_name=TEST_NODE_NAME,
            secret_key=TEST_SECRET_KEY
        )
        
        # Create and send a message
        msg1 = handler.create_message(MessageType.SYNC_REQUEST, {"data": "test"}, sign=True)
        
        # Should be valid first time
        is_valid, _ = handler.validate_message(msg1, check_replay=True)
        assert is_valid is True
        
        # Try to reuse the same message (replay attack)
        is_valid, reason = handler.validate_message(msg1, check_replay=True)
        assert is_valid is False
        assert "replay" in reason.lower()
        
        # Create a new message with same nonce (simulate replay)
        msg2 = Message(
            message_type=MessageType.SYNC_REQUEST,
            payload={"data": "test"},
            nonce=msg1.nonce  # Same nonce as msg1
        )
        msg2.sign(TEST_SECRET_KEY)
        
        # Should be detected as replay
        is_valid, reason = handler.validate_message(msg2, check_replay=True)
        assert is_valid is False
        assert "replay" in reason.lower()
