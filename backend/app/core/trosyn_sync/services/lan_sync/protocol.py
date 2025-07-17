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
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
from enum import Enum, auto
from typing import Any, Callable, Dict, Optional, Tuple, Type, TypeVar, Union

# Constants for message security
MESSAGE_TTL = 60  # 60 seconds message TTL
HMAC_ALGORITHM = "sha256"
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
    SYNC_DATA = auto()  # Actual data being synced
    SYNC_ACK = auto()  # Acknowledgment of received data
    SYNC_COMPLETE = auto()  # Indicates sync process is complete

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

    def _get_signing_data(self) -> Dict[str, Any]:
        """Get the data to be used for signing/verification.

        This method relies on `to_dict` to create a canonical representation
        of the message, then removes the signature field.
        """
        logger.debug("\n[GET_SIGNING_DATA] Creating signing data from to_dict()...")

        # Use the canonical dictionary representation of the message
        signing_data = self.to_dict()

        # The signature itself must not be part of the data used to generate the signature
        if "signature" in signing_data:
            del signing_data["signature"]
            logger.debug("[GET_SIGNING_DATA] Removed 'signature' field for signing.")

        # Log the final signing data for debugging
        logger.debug(
            "\n[GET_SIGNING_DATA] Final signing data structure (before JSON serialization):"
        )
        for key, value in signing_data.items():
            logger.debug(
                f"[GET_SIGNING_DATA]   {key}: {value!r} (type: {type(value).__name__})"
            )

        # Log the exact JSON string that will be signed for deeper debugging
        try:
            # Use the same JSON serialization as in the sign() method
            json_str = json.dumps(
                signing_data,
                sort_keys=True,
                ensure_ascii=False,
                separators=(",", ":"),
                default=str,
            )

            # Log the JSON string and its bytes representation
            logger.debug("\n[GET_SIGNING_DATA] JSON string to be signed:")
            logger.debug(f"[GET_SIGNING_DATA]   {json_str}")

            # Log the exact bytes that will be hashed
            json_bytes = json_str.encode("utf-8")
            logger.debug("\n[GET_SIGNING_DATA] Bytes to be hashed (hex):")
            logger.debug(f"[GET_SIGNING_DATA]   {json_bytes.hex()}")

            # Log the HMAC hash for verification
            if hasattr(self, "_last_secret_key"):
                import hashlib
                import hmac

                hmac_obj = hmac.new(self._last_secret_key, json_bytes, hashlib.sha256)
                expected_signature = hmac_obj.hexdigest()
                logger.debug("\n[GET_SIGNING_DATA] Expected HMAC-SHA256 signature:")
                logger.debug(f"[GET_SIGNING_DATA]   {expected_signature}")

                if hasattr(self, "signature") and self.signature:
                    logger.debug("\n[GET_SIGNING_DATA] Current message signature:")
                    logger.debug(f"[GET_SIGNING_DATA]   {self.signature}")

                    # Compare signatures byte by byte
                    if len(expected_signature) != len(self.signature):
                        logger.warning("[GET_SIGNING_DATA] Signature length mismatch!")
                        logger.warning(
                            f"[GET_SIGNING_DATA]   Expected length: {len(expected_signature)}"
                        )
                        logger.warning(
                            f"[GET_SIGNING_DATA]   Actual length: {len(self.signature)}"
                        )
                    else:
                        # Find the first position where signatures differ
                        for i, (e, a) in enumerate(
                            zip(expected_signature, self.signature)
                        ):
                            if e != a:
                                logger.warning(
                                    f"[GET_SIGNING_DATA] First mismatch at position {i}:"
                                )
                                logger.warning(
                                    f"[GET_SIGNING_DATA]   Expected: '{e}' (0x{ord(e):02x})"
                                )
                                logger.warning(
                                    f"[GET_SIGNING_DATA]   Actual:   '{a}' (0x{ord(a):02x})"
                                )
                                break
                        else:
                            logger.debug("[GET_SIGNING_DATA] Signatures match!")

        except Exception as e:
            logger.error(
                f"[GET_SIGNING_DATA] Error serializing signing data: {e}", exc_info=True
            )

        return signing_data

    def sign(self, secret_key: bytes) -> None:
        """Sign the message with HMAC.

        Args:
            secret_key: The shared secret key used for HMAC signing

        Raises:
            ValueError: If secret_key is not provided or empty
        """
        if not secret_key:
            raise ValueError("Secret key is required for signing")

        # Store the secret key for debugging (will be used in _get_signing_data)
        self._last_secret_key = secret_key

        # Reset any existing signature
        self.signature = None

        logger.debug("\n[SIGN] === Starting message signing process ===")
        logger.debug(f"[SIGN] Message ID: {self.message_id}")
        logger.debug(
            f"[SIGN] Message type: {getattr(self.message_type, 'name', str(self.message_type))}"
        )
        logger.debug(
            f"[SIGN] Message type class: {self.message_type.__class__.__name__}"
        )
        if hasattr(self.message_type, "name"):
            logger.debug(f"[SIGN] Message type name: {self.message_type.name!r}")
        if hasattr(self.message_type, "value"):
            logger.debug(f"[SIGN] Message type value: {self.message_type.value!r}")
        logger.debug(f"[SIGN] Secret key (first 8 bytes): {secret_key[:8].hex()}...")
        logger.debug(f"[SIGN] Current signature (before signing): {self.signature}")

        # Log the exact data that will be signed
        sign_data = self._get_signing_data()
        logger.debug("\n[SIGN] Data to be signed:")
        for k, v in sign_data.items():
            logger.debug(f"[SIGN]   {k}: {v!r} (type: {type(v).__name__})")

        # Log the current state of the message
        logger.debug("\n[SIGN] Current message state:")
        for field in [
            "message_type",
            "message_id",
            "timestamp",
            "nonce",
            "source",
            "destination",
        ]:
            value = getattr(self, field, None)
            logger.debug(f"[SIGN]   {field}: {value!r} (type: {type(value).__name__})")
        logger.debug(f"[SIGN]   payload: {getattr(self, 'payload', None)!r}")

        # Log the exact type of message_type
        logger.debug(
            f"[SIGN] message_type class: {self.message_type.__class__.__name__}"
        )
        logger.debug(f"[SIGN] message_type value: {self.message_type!r}")
        if hasattr(self.message_type, "name"):
            logger.debug(f"[SIGN] message_type.name: {self.message_type.name!r}")
        if hasattr(self.message_type, "value"):
            logger.debug(f"[SIGN] message_type.value: {self.message_type.value!r}")

        # 1. Get the signable data (already properly serialized)
        sign_data = self._get_signing_data()

        # 2. Log the signing data in detail
        logger.debug("\n[SIGN] === Message Signing Data ===")
        logger.debug("[SIGN] Raw sign_data (before JSON serialization):")
        for k, v in sign_data.items():
            if k == "payload" and isinstance(v, dict):
                logger.debug(f"[SIGN]   {k} (dict with {len(v)} items):")
                for pk, pv in v.items():
                    logger.debug(f"[SIGN]     {pk}: {pv} (type: {type(pv).__name__})")
            else:
                logger.debug(f"[SIGN]   {k}: {v} (type: {type(v).__name__})")

        # 3. Create the JSON string for signing
        logger.debug("\n[SIGN] === JSON Serialization ===")

        # Log the JSON serialization settings
        logger.debug("[SIGN] JSON serialization settings:")
        logger.debug("[SIGN]   sort_keys=True")
        logger.debug("[SIGN]   ensure_ascii=False")
        logger.debug("[SIGN]   separators=(',', ':')")
        logger.debug("[SIGN]   default=str")

        # Convert to JSON string with consistent formatting
        sign_str = json.dumps(
            sign_data,
            sort_keys=True,
            ensure_ascii=False,
            separators=(",", ":"),
            default=str,  # Handle any non-serializable types
        )
        sign_bytes = sign_str.encode("utf-8")

        # Log the serialized data
        logger.debug(f"\n[SIGN] Serialized JSON (length: {len(sign_str)}): {sign_str}")
        logger.debug(
            f"[SIGN] UTF-8 bytes (length: {len(sign_bytes)}): {sign_bytes.hex()}"
        )

        # Log the exact bytes being signed in a readable format
        logger.debug("\n[SIGN] Raw bytes being signed (hex):")
        for i in range(0, len(sign_bytes), 16):
            chunk = sign_bytes[i : i + 16]
            hex_part = " ".join(f"{b:02x}" for b in chunk)
            ascii_part = "".join(chr(b) if 32 <= b <= 126 else "." for b in chunk)
            logger.debug(f"[SIGN]   {i:04x}: {hex_part.ljust(47)}  {ascii_part}")

        # Also log as a continuous hex string for easy comparison
        logger.debug(f"[SIGN] Continuous hex: {sign_bytes.hex()}")

        # 4. Generate HMAC signature
        logger.debug("\n[SIGN] === Signature Generation ===")

        # Log the key being used (first 8 bytes for security)
        logger.debug(
            f"[SIGN] Using secret key (first 8 bytes): {secret_key[:8].hex()}..."
        )

        # Create HMAC object and generate signature
        hmac_obj = hmac.new(secret_key, sign_bytes, hashlib.sha256)
        self.signature = hmac_obj.hexdigest()

        # 5. Log signature generation details
        logger.debug(f"[SIGN] HMAC algorithm: {hmac_obj.name}")
        logger.debug(f"[SIGN] HMAC digest size: {hmac_obj.digest_size} bytes")
        logger.debug(f"[SIGN] HMAC block size: {hmac_obj.block_size} bytes")
        logger.debug(f"[SIGN] Generated signature: {self.signature}")

        # 6. Verify the signature can be verified with the same data
        logger.debug("\n[SIGN] === Verifying generated signature ===")
        test_hmac = hmac.new(secret_key, sign_bytes, hashlib.sha256)
        test_signature = test_hmac.hexdigest()

        logger.debug(f"[SIGN] Test signature: {test_signature}")
        logger.debug(f"[SIGN] Stored signature: {self.signature}")

        if test_signature != self.signature:
            logger.error("\n[SIGN] !!! SIGNATURE VALIDATION FAILED !!!")
            logger.error(f"[SIGN] Expected: {test_signature}")
            logger.error(f"[SIGN] Actual:   {self.signature}")

            # Find the first position where signatures differ
            for i, (a, b) in enumerate(zip(test_signature, self.signature)):
                if a != b:
                    logger.error(
                        f"[SIGN] First mismatch at position {i}: expected '{a}' (0x{ord(a):02x}), got '{b}' (0x{ord(b):02x})"
                    )
                    break
        else:
            logger.debug("[SIGN] Signature self-test passed")

    def verify_signature(self, secret_key: bytes) -> bool:
        """Verify the message signature.

        Args:
            secret_key: The shared secret key used for HMAC signing

        Returns:
            bool: True if the signature is valid, False otherwise
        """
        try:
            if not self.signature:
                logger.warning("[VERIFY] No signature present to verify")
                return False

            if not secret_key:
                logger.warning("[VERIFY] No secret key provided for verification")
                return False

            # Log the secret key being used (first 8 bytes for security)
            logger.debug(
                f"[VERIFY] Using secret key (first 8 bytes): {secret_key[:8].hex() if secret_key else 'None'}..."
            )

            # Get the data that was used for signing
            sign_data = self._get_signing_data()

            logger.debug("\n[VERIFY] Data used for verification:")
            for k, v in sign_data.items():
                logger.debug(f"[VERIFY]   {k}: {v!r} (type: {type(v).__name__})")

            # Create the exact same JSON string as in sign()
            sign_str = json.dumps(
                sign_data,
                sort_keys=True,
                ensure_ascii=False,
                separators=(",", ":"),
                default=str,
            )
            sign_bytes = sign_str.encode("utf-8")

            # Log the exact bytes being verified
            logger.debug("\n[VERIFY] JSON string being verified:")
            logger.debug(f"[VERIFY]   {sign_str}")
            logger.debug("\n[VERIFY] Bytes being hashed (hex):")
            logger.debug(f"[VERIFY]   {sign_bytes.hex()}")

            # Generate the expected HMAC signature
            hmac_obj = hmac.new(secret_key, sign_bytes, hashlib.sha256)
            expected_signature = hmac_obj.hexdigest()

            # Log the expected signature
            logger.debug("\n[VERIFY] Expected HMAC-SHA256 signature:")
            logger.debug(f"[VERIFY]   {expected_signature}")
            logger.debug(f"[VERIFY] Current signature: {self.signature}")

            # Compare signatures using a constant-time comparison.
            actual_signature = self.signature or ""
            is_valid = hmac.compare_digest(expected_signature, actual_signature)

            if not is_valid:
                logger.warning("\n[VERIFY] SIGNATURE MISMATCH!")
                logger.warning(f"[VERIFY]   - Expected: {expected_signature}")
                logger.warning(f"[VERIFY]   - Actual:   {actual_signature}")

                # Check signature length
                if len(expected_signature) != len(actual_signature):
                    logger.warning(
                        f"[VERIFY] Signature length mismatch: expected {len(expected_signature)}, got {len(actual_signature)}"
                    )
                else:
                    # Find the first position where signatures differ
                    for i, (e, a) in enumerate(
                        zip(expected_signature, actual_signature)
                    ):
                        if e != a:
                            logger.warning(f"[VERIFY] First mismatch at position {i}:")
                            logger.warning(
                                f"[VERIFY]   Expected: '{e}' (0x{ord(e):02x})"
                            )
                            logger.warning(
                                f"[VERIFY]   Actual:   '{a}' (0x{ord(a):02x})"
                            )
                            break

                # Check if the issue is with the secret key
                if hasattr(self, "_last_secret_key"):
                    if self._last_secret_key != secret_key:
                        logger.warning(
                            "[VERIFY] Secret key mismatch between signing and verification!"
                        )
                        logger.warning(
                            f"[VERIFY]   Signing key (first 8): {self._last_secret_key[:8].hex() if self._last_secret_key else 'None'}..."
                        )
                        logger.warning(
                            f"[VERIFY]   Verify key (first 8):  {secret_key[:8].hex() if secret_key else 'None'}..."
                        )
            else:
                logger.debug("[VERIFY] Signature verification succeeded.")

            return is_valid

        except Exception as e:
            logger.error(
                f"[VERIFY] An unexpected error occurred during signature verification: {e}",
                exc_info=True,
            )
            return False

    @classmethod
    def from_bytes(cls, data: bytes) -> Message:
        """Deserialize message from bytes."""
        try:
            logger.debug(f"[DESERIALIZE] Raw bytes (hex): {data.hex()}")
            json_str = data.decode("utf-8")
            logger.debug(f"[DESERIALIZE] JSON string: {json_str}")
            msg_dict = json.loads(json_str)
            logger.debug(f"[DESERIALIZE] Parsed dict: {msg_dict}")
            message = cls.from_dict(msg_dict)
            logger.debug(f"[DESERIALIZE] Created message: {message}")
            logger.debug(f"[DESERIALIZE] Message details: {message.__dict__}")
            return message
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            logger.error(f"[DESERIALIZE] Failed to deserialize message: {e}")
            logger.error(f"[DESERIALIZE] Data (hex): {data.hex() if data else 'None'}")
            logger.error(
                f"[DESERIALIZE] Data (str): {data.decode('utf-8', errors='replace') if data else 'None'}"
            )
            raise ValueError("Invalid message format") from e

    @classmethod
    def from_dict(cls, data: dict) -> Message:
        """Create a Message from a dictionary."""
        if not isinstance(data, dict):
            raise ValueError("Message data must be a dictionary")

        logger.debug(f"[FROM_DICT] Input data: {data}")

        # Make a deep copy to avoid modifying the input
        import copy

        data = copy.deepcopy(data)

        # Extract and remove signature before processing other fields
        signature = data.pop("signature", None)

        # Handle message_type conversion first - ensure it's a MessageType enum
        if "message_type" in data and data["message_type"] is not None:
            try:
                message_type = data["message_type"]

                if isinstance(message_type, MessageType):
                    # Already a MessageType, use as is
                    data["message_type"] = message_type
                elif isinstance(message_type, str):
                    # Handle string message types (e.g., 'AUTH_REQUEST')
                    if message_type.isdigit():
                        # Handle case where it's a string number (e.g., '1' for HEARTBEAT)
                        data["message_type"] = MessageType(int(message_type))
                    else:
                        # Handle string name (e.g., 'HEARTBEAT')
                        data["message_type"] = MessageType[message_type]
                    logger.debug(
                        f"[FROM_DICT] Converted string '{message_type}' to MessageType: {data['message_type']}"
                    )
                elif isinstance(message_type, int):
                    # Handle integer message types (e.g., 11 for HEARTBEAT)
                    data["message_type"] = MessageType(message_type)
                    logger.debug(
                        f"[FROM_DICT] Converted int {message_type} to MessageType: {data['message_type']}"
                    )
                else:
                    raise ValueError(
                        f"Unsupported message_type type: {type(message_type).__name__}"
                    )

                logger.debug(
                    f"[FROM_DICT] Final message_type: {data['message_type']} (type: {type(data['message_type']).__name__})"
                )

            except (KeyError, ValueError) as e:
                logger.error(f"[FROM_DICT] Failed to convert message_type: {e}")
                logger.error(
                    f"[FROM_DICT] message_type value: {data.get('message_type')}"
                )
                logger.error(
                    f"[FROM_DICT] Available message types: {[t.name for t in MessageType]}"
                )
                raise ValueError(
                    f"Invalid message_type: {data.get('message_type')}"
                ) from e

        # Ensure payload is always a dictionary
        if "payload" in data and not isinstance(data["payload"], dict):
            logger.warning(
                f"[FROM_DICT] Payload is not a dict: {data['payload']}. Converting to empty dict."
            )
            data["payload"] = {}

        # Create a new message with the processed data
        try:
            # Only include fields that are part of the Message class
            message_fields = {}
            for field_name in cls.__annotations__:
                if field_name in data:
                    message_fields[field_name] = data[field_name]

            # Create the message instance
            message = cls(**message_fields)

            # Set the signature if it was provided
            if signature is not None:
                message.signature = signature

            # Debug log the final message details
            logger.debug(
                f"[FROM_DICT] Successfully created message with ID: {message.message_id}"
            )
            logger.debug(
                f"[FROM_DICT] Message type: {message.message_type.name} (type: {type(message.message_type).__name__})"
            )
            logger.debug(f"[FROM_DICT] Has signature: {message.signature is not None}")

            return message

        except Exception as e:
            logger.error(f"[FROM_DICT] Failed to create Message: {e}")
            logger.error(f"[FROM_DICT] Message fields: {data}")
            logger.error(f"[FROM_DICT] Exception type: {type(e).__name__}")
            raise

    def to_dict(self) -> Dict[str, Any]:
        """Convert message to a canonical dictionary representation.

        This method ensures consistent serialization of the message for signing and transmission.
        The message_type is always converted to its string name for consistency.
        """
        logger.debug("[TO_DICT] Starting message serialization")

        # Create a shallow copy of the message's __dict__ to avoid modifying the original
        data = {k: v for k, v in self.__dict__.items() if not k.startswith("_")}

        # Ensure consistent message_type handling
        if "message_type" in data and data["message_type"] is not None:
            try:
                # Convert message_type to its string name representation
                if isinstance(data["message_type"], MessageType):
                    data["message_type"] = data["message_type"].name
                elif isinstance(data["message_type"], str):
                    # If it's already a string, ensure it matches the enum name
                    try:
                        data["message_type"] = MessageType[data["message_type"]].name
                    except KeyError:
                        # If not a valid enum name, keep as is but log a warning
                        logger.warning(
                            f"[TO_DICT] Unknown message type: {data['message_type']}"
                        )
                elif isinstance(data["message_type"], int):
                    # Convert from numeric value to name
                    data["message_type"] = MessageType(data["message_type"]).name

                logger.debug(f"[TO_DICT] Set message_type to: {data['message_type']}")

            except (KeyError, ValueError) as e:
                logger.error(
                    f"[TO_DICT] Invalid message_type: {data['message_type']} - {e}"
                )
                # Keep the original value but log the error
                data["message_type"] = str(data["message_type"])

        # Ensure payload is always a dictionary
        if "payload" in data and not isinstance(data["payload"], dict):
            logger.warning(
                f"[TO_DICT] Payload is not a dict: {data['payload']}. Converting to empty dict."
            )
            data["payload"] = {}

        # Remove fields with None values to create a compact representation
        # This ensures consistent serialization between sender and receiver
        data = {k: v for k, v in data.items() if v is not None}

        # Log the final serialized data for debugging
        logger.debug(f"[TO_DICT] Final serialized message: {data}")
        return data

    def to_bytes(self) -> bytes:
        """Serialize message to bytes."""
        msg_dict = self.to_dict()
        logger.debug(f"[SERIALIZE] Message dict: {msg_dict}")
        json_str = json.dumps(msg_dict)
        logger.debug(f"[SERIALIZE] JSON string: {json_str}")
        data = json_str.encode("utf-8")
        logger.debug(f"[SERIALIZE] Bytes (hex): {data.hex()}")
        return data

    def __str__(self) -> str:
        """String representation of the message."""
        return f"{self.message_type.name} (id: {self.message_id}, ts: {self.timestamp})"


class ProtocolHandler:
    """Handles protocol-level operations for LAN sync with security features."""

    def __init__(
        self, node_id: str, node_name: str, secret_key: Optional[bytes] = None
    ):
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

    def create_message(
        self,
        message_type: MessageType,
        payload: Optional[Dict[str, Any]] = None,
        destination: Optional[Dict[str, str]] = None,
        sign: bool = True,
    ) -> Message:
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
            destination=destination,
        )

        if sign and self.secret_key:
            message.sign(self.secret_key)

        return message

    def create_discovery_broadcast(self) -> Message:
        """Create a discovery broadcast message."""
        return self.create_message(
            MessageType.DISCOVERY_BROADCAST, {"capabilities": ["sync", "file_transfer"]}
        )

    def create_discovery_response(self, broadcast_msg: Message) -> Message:
        """Create a response to a discovery broadcast."""
        return self.create_message(
            MessageType.DISCOVERY_RESPONSE,
            {
                "capabilities": ["sync", "file_transfer"],
                "services": ["document_sync", "model_updates"],
            },
            destination=broadcast_msg.source,
        )

    def validate_message(
        self, message: Message, check_signature: bool = True, check_replay: bool = True
    ) -> Tuple[bool, str]:
        """Validate a received message.

        Args:
            message: The message to validate
            check_signature: Whether to verify the message signature
            check_replay: Whether to check for replay attacks

        Returns:
            Tuple of (is_valid, reason)
        """
        logger.debug(
            f"[VALIDATE] Starting validation for message: {message.message_id}"
        )
        logger.debug(f"[VALIDATE] Message details: {message.__dict__}")

        # Clean up old nonces periodically
        if time.time() - self._nonce_cleanup_time > 300:  # Cleanup every 5 minutes
            self._cleanup_old_nonces()
            self._nonce_cleanup_time = time.time()

        # Check and convert message type
        if isinstance(message.message_type, str):
            try:
                message.message_type = MessageType[message.message_type]
                logger.debug(
                    f"[VALIDATE] Converted message type from string to enum: {message.message_type}"
                )
            except KeyError:
                reason = f"Invalid message type string: {message.message_type}"
                logger.warning(f"[VALIDATE] {reason}")
                return False, reason
        elif not isinstance(message.message_type, MessageType):
            reason = f"Invalid message type: {type(message.message_type).__name__}"
            logger.warning(f"[VALIDATE] {reason}")
            return False, reason

        # Check required fields
        missing_fields = [
            field
            for field in ["message_id", "timestamp", "nonce"]
            if not getattr(message, field, None)
        ]
        if missing_fields:
            reason = f"Missing required fields: {', '.join(missing_fields)}"
            logger.warning(f"[VALIDATE] {reason}")
            return False, reason

        # Check if message is expired
        if message.is_expired():
            reason = f"Message expired (timestamp: {message.timestamp})"
            logger.warning(f"[VALIDATE] {reason}")
            return False, reason

        # Verify signature if required
        if check_signature and self.secret_key:
            logger.debug("[VALIDATE] Checking message signature...")
            if not message.signature:
                reason = "Message not signed"
                logger.warning(f"[VALIDATE] {reason}")
                return False, reason

            if not message.verify_signature(self.secret_key):
                reason = "Invalid message signature"
                logger.warning(f"[VALIDATE] {reason}")
                return False, reason

        # Only add nonce to seen_nonces after successful signature verification
        if check_replay:
            if message.nonce in self._seen_nonces:
                reason = f"Possible replay attack detected (nonce: {message.nonce})"
                logger.warning(f"[VALIDATE] {reason}")
                return False, reason
            # Add nonce to seen_nonces after successful validation
            self._seen_nonces.add(message.nonce)
            logger.debug(f"[VALIDATE] Added nonce to seen_nonces: {message.nonce}")

        return True, ""
