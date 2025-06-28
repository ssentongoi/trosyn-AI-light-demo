"""
TCP Server for LAN Sync

This module implements a TCP server for handling sync operations between nodes.
"""
import asyncio
import json
import logging
import struct
import ssl
import uuid
from typing import Any, Callable, Dict, List, Optional, Tuple, Awaitable

from .protocol import Message, MessageType, ProtocolHandler
from .config import LANConfig
from .security import security

# Authentication middleware type
AuthMiddleware = Callable[[Message], Awaitable[Tuple[bool, Optional[Dict[str, Any]]]]]

logger = logging.getLogger(__name__)

class TCPSyncServer:
    """TCP server for handling sync operations between nodes."""

    def __init__(
        self,
        config: LANConfig,
        handler: ProtocolHandler,
        auth_middleware: Optional[AuthMiddleware] = None,
        require_auth: bool = True
    ):
        """Initialize the TCP sync server."""
        self.config = config
        self.handler = handler
        self.auth_middleware = auth_middleware
        self.require_auth = require_auth
        self.server: Optional[asyncio.Server] = None
        self.clients: Dict[str, Dict[str, Any]] = {}
        self.running = False
        self.ssl_context = security.get_ssl_context(server_side=True) if self.config.use_ssl else None
        self.public_handlers = {
            MessageType.AUTH_REQUEST: self._handle_auth_request,
            MessageType.HEARTBEAT: self._handle_heartbeat,
        }
        self.authenticated_handlers = {
            MessageType.SYNC_REQUEST: self._handle_sync_request,
            MessageType.SYNC_DATA: self._handle_sync_data,
            MessageType.SYNC_ACK: self._handle_sync_ack,
        }
        self.message_handlers = {**self.public_handlers, **self.authenticated_handlers}
        self._tasks: List[asyncio.Task] = []

    async def start(self) -> None:
        """Start the TCP sync server non-blockingly."""
        if self.running:
            return

        ssl_context = self.ssl_context if self.config.use_ssl else None
        try:
            self.server = await asyncio.start_server(
                self._handle_client,
                host='0.0.0.0',
                port=self.config.sync_port,
                ssl=ssl_context,
                reuse_address=True
            )
        except Exception as e:
            logger.error(f"Failed to start TCP server: {e}")
            raise

        self.running = True
        addr = self.server.sockets[0].getsockname()
        protocol = "TLS" if ssl_context else "TCP (unencrypted)"
        logger.info(f"TCP sync server listening on {addr[0]}:{addr[1]} ({protocol})")

        # The server.serve_forever() task is essential for accepting new connections.
        self._tasks.append(asyncio.create_task(self.server.serve_forever()))
        # Heartbeats and client cleanup are also critical background tasks.
        self._tasks.append(asyncio.create_task(self._send_heartbeats()))
        self._tasks.append(asyncio.create_task(self._cleanup_clients()))


    async def stop(self) -> None:
        """Stop the TCP sync server and all related tasks."""
        if not self.running:
            return

        logger.info("Stopping TCP sync server...")
        self.running = False

        # 1. Cancel all background tasks (including serve_forever)
        for task in self._tasks:
            if not task.done():
                task.cancel()
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)
        self._tasks.clear()

        # 2. Close all client connections
        client_writers = [client['writer'] for client in self.clients.values()]
        for writer in client_writers:
            if writer and not writer.is_closing():
                try:
                    writer.close()
                    await writer.wait_closed()
                except Exception as e:
                    logger.warning(f"Error closing client writer: {e}")
        self.clients.clear()

        # 3. Close the main server
        if self.server:
            self.server.close()
            await self.server.wait_closed()
            self.server = None

        logger.info("TCP sync server stopped.")

    async def _handle_client(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        """Handle a new client connection."""
        client_id = str(uuid.uuid4())
        client_addr = writer.get_extra_info('peername')
        logger.info(f"New connection from {client_addr} (ID: {client_id})")

        self.clients[client_id] = {'writer': writer, 'authenticated': False, 'auth_data': None, 'last_seen': asyncio.get_event_loop().time()}

        try:
            while self.running:
                # Read message length (4 bytes)
                header = await reader.readexactly(4)
                if not header:
                    break # Connection closed cleanly by peer
                
                msg_length = struct.unpack('>I', header)[0]
                
                # Read message data
                data = await reader.readexactly(msg_length)
                
                # Process the message
                await self._process_message(data, client_id)
                
        except (asyncio.IncompleteReadError, ConnectionResetError) as e:
            logger.debug(f"Client {client_id} at {client_addr} disconnected: {e}")
        except asyncio.CancelledError:
            logger.info(f"Client handler for {client_id} cancelled.")
        except Exception as e:
            logger.error(f"Error handling client {client_id}: {e}", exc_info=True)
        finally:
            # Clean up client resources
            if writer and not writer.is_closing():
                try:
                    writer.close()
                    await writer.wait_closed()
                except Exception as e:
                    logger.warning(f"Error closing writer for {client_id}: {e}")
            if client_id in self.clients:
                del self.clients[client_id]
            logger.info(f"Client {client_id} connection closed")

    async def _send_message(self, message: Message, client_id: str) -> None:
        """Send a message to a specific client."""
        if client_id not in self.clients:
            logger.warning(f"Attempted to send message to disconnected client {client_id}")
            return

        writer = self.clients[client_id]['writer']
        try:
            data = message.to_bytes()
            # Prepend message length
            writer.write(struct.pack('!I', len(data)))
            writer.write(data)
            await writer.drain()
            logger.debug(f"Sent {message.message_type.name} to {client_id}")
        except (ConnectionResetError, BrokenPipeError):
            logger.warning(f"Connection lost with client {client_id} while sending message.")
            # The connection is closed, _handle_client will do the cleanup.
        except Exception as e:
            logger.error(f"Error sending message to {client_id}: {e}")

    async def _send_error(self, client_id: str, error: str, code: str = "generic_error", request_id: Optional[str] = None) -> None:
        """Send an error message to a client."""
        payload = {"error": error, "code": code}
        if request_id:
            payload["request_id"] = request_id
        
        try:
            error_message = self.handler.create_message(MessageType.ERROR, payload)
            await self._send_message(error_message, client_id)
            logger.debug(f"Sent error '{error}' to {client_id}")
        except Exception as e:
            logger.error(f"Failed to send error message to {client_id}: {e}")

    async def _close_client_connection(self, client_id: str) -> None:
        """Safely close a client's connection.

        This method closes the writer, which will cause the reading loop in
        _handle_client to exit and trigger the full cleanup logic there.
        """
        if client_id in self.clients:
            writer = self.clients[client_id].get('writer')
            if writer and not writer.is_closing():
                logger.info(f"Closing connection for client {client_id}")
                writer.close()
                try:
                    await writer.wait_closed()
                except Exception as e:
                    logger.warning(f"Error waiting for client {client_id} connection to close: {e}")

    async def _process_message(self, data: bytes, client_id: str) -> None:
        """Process an incoming message from a client."""
        message: Optional[Message] = None
        request_id: Optional[str] = None
        try:
            message = Message.from_bytes(data)
            logger.debug(f"Received {message.message_type.name} from {client_id} (ID: {message.message_id})")

            # Extract request_id early for error reporting
            if isinstance(message.payload, dict):
                request_id = message.payload.get('request_id')

            # Only validate signature if authentication is required
            check_signature = self.require_auth and message.message_type not in self.public_handlers
            is_valid, reason = self.handler.validate_message(
                message, 
                check_signature=check_signature
            )
            if not is_valid:
                logger.warning(f"Invalid message from {client_id}: {reason}. Closing connection.")
                await self._send_error(client_id, reason, code="validation_failed", request_id=request_id)
                await self._close_client_connection(client_id)
                return

            # Check authentication if required
            if (message.message_type not in self.public_handlers and 
                self.require_auth and 
                not self.clients[client_id]['authenticated']):
                logger.warning(f"Unauthenticated access attempt from {client_id}. Closing connection.")
                await self._send_error(client_id, "Authentication required", code="auth_required", request_id=request_id)
                await self._close_client_connection(client_id)
                return

            # Update last seen timestamp
            self.clients[client_id]['last_seen'] = asyncio.get_event_loop().time()

            # Route to the appropriate handler
            handler = self.message_handlers.get(message.message_type)
            if handler:
                await handler(message, client_id)
            else:
                logger.warning(f"No handler for message type {message.message_type.name} from {client_id}")
                await self._send_error(client_id, f"Unsupported message type: {message.message_type.name}", code="unsupported_type", request_id=request_id)

        except (json.JSONDecodeError, struct.error, ValueError) as e:
            logger.error(f"Failed to decode message from {client_id}: {e}")
            # Cannot get request_id if message is malformed
            await self._send_error(client_id, "Invalid message format", code="decode_error")
        except Exception as e:
            # Use the request_id extracted earlier if available
            logger.exception(f"Error processing message from {client_id} (request_id: {request_id}): {e}")
            await self._send_error(client_id, "Internal server error", code="internal_error", request_id=request_id)

    async def _handle_auth_request(self, message: Message, client_id: str) -> None:
        """Handle an authentication request."""
        if not self.auth_middleware:
            logger.warning("Auth middleware not configured, ignoring auth request.")
            return

        is_authenticated, auth_data = await self.auth_middleware(message)
        if is_authenticated:
            self.clients[client_id]['authenticated'] = True
            self.clients[client_id]['auth_data'] = auth_data
            response_payload = {'success': True}
            logger.info(f"Client {client_id} authenticated successfully.")
        else:
            response_payload = {'success': False, 'error': 'Invalid credentials'}
            logger.warning(f"Client {client_id} authentication failed.")

        # Echo the request_id back to the client for proper response handling
        if 'request_id' in message.payload:
            response_payload['request_id'] = message.payload['request_id']

        response = self.handler.create_message(MessageType.AUTH_RESPONSE, response_payload)
        await self._send_message(response, client_id)

    async def _handle_sync_request(self, message: Message, client_id: str) -> None:
        """Placeholder for handling sync requests."""
        logger.debug(f"Received sync request from {client_id}")

    async def _handle_sync_data(self, message: Message, client_id: str) -> None:
        """Placeholder for handling sync data."""
        logger.debug(f"Received sync data from {client_id}")

    async def _handle_sync_ack(self, message: Message, client_id: str) -> None:
        """Placeholder for handling sync acknowledgments."""
        logger.debug(f"Received sync ack from {client_id}")

    async def _handle_heartbeat(self, message: Message, client_id: str) -> None:
        """Handle a heartbeat from a client (usually a response)."""
        logger.debug(f"Received heartbeat from {client_id}")
        # The 'last_seen' timestamp is already updated in _process_message

    async def _send_heartbeats(self) -> None:
        """Periodically send heartbeats to all connected clients."""
        while self.running:
            await asyncio.sleep(self.config.heartbeat_interval)
            heartbeat_message = self.handler.create_message(MessageType.HEARTBEAT, {})
            # Use list(self.clients.keys()) to avoid issues with dict size changing during iteration
            for client_id in list(self.clients.keys()):
                try:
                    # Check if client still exists before sending
                    if client_id in self.clients:
                        await self._send_message(heartbeat_message, client_id)
                except ConnectionError:
                    # Client is already disconnected, will be cleaned up by _handle_client
                    logger.debug(f"Could not send heartbeat to {client_id}, connection likely closed.")
                except Exception as e:
                    logger.error(f"Error sending heartbeat to {client_id}: {e}")

    async def _cleanup_clients(self) -> None:
        """Periodically remove inactive clients."""
        while self.running:
            await asyncio.sleep(self.config.client_cleanup_interval)
            now = asyncio.get_event_loop().time()
            # Use list() to create a copy of keys for safe iteration
            for client_id in list(self.clients.keys()):
                client_info = self.clients.get(client_id)
                if client_info and (now - client_info['last_seen']) > self.config.client_timeout:
                    logger.info(f"Client {client_id} timed out. Disconnecting.")
                    writer = client_info['writer']
                    if writer and not writer.is_closing():
                        writer.close() # This will trigger the cleanup in _handle_client

    async def __aenter__(self):
        """Async context manager entry."""
        await self.start()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.stop()
