"""
LAN Sync Protocol Implementation

This module defines the message formats and protocol handling for LAN synchronization.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import time
from dataclasses import dataclass, asdict, field
from datetime import datetime, timedelta
from enum import Enum, auto
from typing import Dict, Any, Optional, Type, TypeVar, Tuple, Union, Callable
import uuid

# Constants for message security
MESSAGE_TTL = 60  # 60 seconds message TTL
HMAC_ALGORITHM = 'sha256'
NONCE_SIZE = 16  # 16 bytes for nonce

# Configure logging
logger = logging.getLogger(__name__)

class MessageType(Enum):
    """Types of messages in the LAN sync protocol."""
    # Discovery messages
    DISCOVERY_BROADCAST = auto()
    DISCOVERY_RESPONSE = auto()
    
    # Authentication messages
    AUTH_REQUEST = auto()
    AUTH_RESPONSE = auto()
    AUTH_CHALLENGE = auto()
    
    # Synchronization messages
    SYNC_REQUEST = auto()
    SYNC_RESPONSE = auto()  # Response to SYNC_REQUEST before data transfer
    SYNC_DATA = auto()     # Actual data being synced
    SYNC_ACK = auto()      # Acknowledgment of received data
    SYNC_COMPLETE = auto() # Indicates sync process is complete
    
    # Heartbeat
    HEARTBEAT = auto()
    
    # Error handling
    ERROR = auto()

@dataclass
class Message:
    """Base message class for LAN sync protocol with security features."""
    message_type: MessageType
    payload: Dict[str, Any] = field(default_factory=dict)
    message_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    nonce: str = field(default_factory=lambda: os.urandom(NONCE_SIZE).hex())
    signature: Optional[str] = None
    source: Optional[Dict[str, str]] = None
    destination: Optional[Dict[str, str]] = None
    
    def is_expired(self, ttl: int = MESSAGE_TTL) -> bool:
        """Check if the message has expired."""
        try:
            msg_time = datetime.fromisoformat(self.timestamp)
            return (datetime.utcnow() - msg_time) > timedelta(seconds=ttl)
        except (ValueError, TypeError):
            return True
            
    def sign(self, secret_key: bytes) -> None:
        """Sign the message with HMAC."""
        if not secret_key:
            raise ValueError("Secret key is required for signing")
            
        # Create a signable representation of the message
        sign_data = {
            'message_type': self.message_type.name,
            'message_id': self.message_id,
            'timestamp': self.timestamp,
            'nonce': self.nonce,
            'source': self.source,
            'destination': self.destination,
            'payload': self.payload
        }
        
        # Create a deterministic JSON string for signing
        sign_str = json.dumps(sign_data, sort_keys=True).encode('utf-8')
        
        # Generate HMAC signature
        self.signature = hmac.new(
            secret_key,
            sign_str,
            hashlib.sha256
        ).hexdigest()
    
    def verify_signature(self, secret_key: bytes) -> bool:
        """Verify the message signature."""
        if not self.signature:
            return False
            
        # Create a copy of the message without the signature
        temp_signature = self.signature
        self.signature = None
        
        try:
            # Generate expected signature
            self.sign(secret_key)
            return hmac.compare_digest(temp_signature, self.signature)
        finally:
            # Restore the original signature
            self.signature = temp_signature
    
    @classmethod
    def from_bytes(cls, data: bytes) -> Message:
        """Deserialize message from bytes."""
        try:
            msg_dict = json.loads(data.decode('utf-8'))
            return cls.from_dict(msg_dict)
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            logger.error(f"Failed to deserialize message: {e}")
            raise ValueError("Invalid message format") from e
    
    @classmethod
    def from_dict(cls, data: dict) -> Message:
        """Create a Message from a dictionary."""
        if not isinstance(data, dict):
            raise ValueError("Message data must be a dictionary")
            
        # Convert message_type from string to enum if needed
        if isinstance(data.get('message_type'), str):
            data['message_type'] = MessageType[data['message_type']]
        elif isinstance(data.get('message_type'), int):
            data['message_type'] = MessageType(data['message_type'])
            
        return cls(**data)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert message to dictionary."""
        data = asdict(self)
        # Convert enum to string for JSON serialization
        data['message_type'] = self.message_type.name
        return data
    
    def to_bytes(self) -> bytes:
        """Serialize message to bytes."""
        return json.dumps(self.to_dict()).encode('utf-8')
    
    def __str__(self) -> str:
        """String representation of the message."""
        return f"{self.message_type.name} (id: {self.message_id}, ts: {self.timestamp})"

class ProtocolHandler:
    """Handles protocol-level operations for LAN sync with security features."""
    
    def __init__(self, node_id: str, node_name: str, secret_key: Optional[bytes] = None):
        """Initialize the protocol handler.
        
        Args:
            node_id: Unique identifier for this node
            node_name: Human-readable name for this node
            secret_key: Optional shared secret key for message signing
        """
        self.node_id = node_id
        self.node_name = node_name
        self.secret_key = secret_key or os.urandom(32)  # 256-bit key
        self._seen_nonces = set()
        self._nonce_cleanup_time = time.time()
        
    def _cleanup_old_nonces(self) -> None:
        """Clean up old nonces to prevent memory leaks."""
        current_time = time.time()
        if current_time - self._nonce_cleanup_time > 300:  # Cleanup every 5 minutes
            self._seen_nonces = set()
            self._nonce_cleanup_time = current_time
    
    def create_message(self, 
                      message_type: MessageType, 
                      payload: Optional[Dict[str, Any]] = None,
                      destination: Optional[Dict[str, str]] = None,
                      sign: bool = True) -> Message:
        """Create a new message with the given type and payload.
        
        Args:
            message_type: Type of the message
            payload: Message payload data
            destination: Optional destination node info
            sign: Whether to sign the message
            
        Returns:
            A new Message instance
        """
        if payload is None:
            payload = {}
            
        message = Message(
            message_type=message_type,
            payload=payload,
            source={"node_id": self.node_id, "node_name": self.node_name},
            destination=destination
        )
        
        if sign and self.secret_key:
            message.sign(self.secret_key)
            
        return message
    
    def create_discovery_broadcast(self) -> Message:
        """Create a discovery broadcast message."""
        return self.create_message(
            MessageType.DISCOVERY_BROADCAST,
            {"capabilities": ["sync", "file_transfer"]}
        )
    
    def create_discovery_response(self, broadcast_msg: Message) -> Message:
        """Create a response to a discovery broadcast."""
        return self.create_message(
            MessageType.DISCOVERY_RESPONSE,
            {
                "capabilities": ["sync", "file_transfer"],
                "services": ["document_sync", "model_updates"]
            },
            destination=broadcast_msg.source
        )
    
    def validate_message(self, message: Message, 
                        check_signature: bool = True,
                        check_replay: bool = True) -> Tuple[bool, str]:
        """Validate a received message.
        
        Args:
            message: The message to validate
            check_signature: Whether to verify the message signature
            check_replay: Whether to check for replay attacks
            
        Returns:
            Tuple of (is_valid, reason)
        """
        if not isinstance(message, Message):
            return False, "Invalid message type"
            
        # Basic validation
        required_fields = [
            ('message_type', 'Missing message type'),
            ('message_id', 'Missing message ID'),
            ('timestamp', 'Missing timestamp'),
            ('nonce', 'Missing nonce')
        ]
        
        for field, error in required_fields:
            if not getattr(message, field, None):
                return False, error
        
        # Validate message type
        try:
            if not isinstance(message.message_type, MessageType):
                message.message_type = MessageType[message.message_type]
        except (KeyError, TypeError):
            return False, f"Invalid message type: {message.message_type}"
        
        # Validate timestamp format and check for expiration
        try:
            msg_time = datetime.fromisoformat(message.timestamp)
            if (datetime.utcnow() - msg_time) > timedelta(seconds=MESSAGE_TTL):
                return False, "Message expired"
        except (ValueError, TypeError):
            return False, "Invalid timestamp format"
            
        # Check for replay attacks
        if check_replay:
            self._cleanup_old_nonces()
            if message.nonce in self._seen_nonces:
                return False, "Possible replay attack detected"
            self._seen_nonces.add(message.nonce)
        
        # Verify message signature if required
        if check_signature and self.secret_key:
            if not message.signature:
                return False, "Message not signed"
                
            if not message.verify_signature(self.secret_key):
                return False, "Invalid message signature"
        
        return True, ""
