"""
TCP Server for LAN Sync

This module implements a TCP server for handling sync operations between nodes.
"""

import asyncio
import json
import logging
import ssl
import struct
import uuid
from typing import Any, Awaitable, Callable, Dict, List, Optional, Tuple

from .config import LANConfig
from .protocol import Message, MessageType, ProtocolHandler
from .security import security

# Authentication middleware type
AuthMiddleware = Callable[[Message], Awaitable[Tuple[bool, Optional[Dict[str, Any]]]]]

logger = logging.getLogger(__name__)


class TCPSyncServer:
    """TCP server for handling sync operations between nodes."""

    def __init__(
        self,
        config: LANConfig,
        protocol_handler: ProtocolHandler,
        auth_middleware: Optional[AuthMiddleware] = None,
        require_auth: bool = True,
        verify_ssl: Optional[bool] = None,
    ):
        """Initialize the TCP sync server.

        Args:
            config: LAN configuration
            handler: Protocol handler for message processing
            auth_middleware: Optional authentication middleware
            require_auth: Whether to require authentication for messages
            verify_ssl: Whether to require client certificate verification.
                      If None, uses TROSYNC_VERIFY_SSL env var.
        """
        self.config = config
        self.handler = protocol_handler
        self.auth_middleware = auth_middleware
        self.require_auth = require_auth
        self.server: Optional[asyncio.Server] = None
        self.clients: Dict[str, Dict[str, Any]] = {}
        self.running = False

        # Initialize SSL context if needed
        self.ssl_context = None
        if self.config.use_ssl:
            self.ssl_context = security.get_ssl_context(
                server_side=True,
                verify_cert=verify_ssl if verify_ssl is not None else None,
            )
            logger.debug(
                f"Initialized server SSL context with verify_mode={self.ssl_context.verify_mode}"
            )
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

    def message_handler(self, message_type: MessageType):
        """Decorator to register a message handler for a specific message type.

        Args:
            message_type: The message type to handle

        Returns:
            A decorator function that registers the handler
        """

        def decorator(func):
            logger.debug(
                f"Registering handler for message type {message_type.name}: {func.__name__}"
            )
            self.message_handlers[message_type] = func
            return func

        return decorator

    @property
    def port(self) -> Optional[int]:
        """Return the port the server is listening on."""
        if self.server and self.server.sockets:
            return self.server.sockets[0].getsockname()[1]
        return None

    async def start(self) -> None:
        """Start the TCP sync server non-blockingly."""
        if self.running:
            return

        if self.config.use_ssl and not self.ssl_context:
            logger.warning(
                "SSL is enabled but no SSL context is configured. Creating a new one..."
            )
            self.ssl_context = security.get_ssl_context(
                server_side=True,
                verify_cert=os.getenv("TROSYNC_VERIFY_SSL", "").lower()
                not in ("0", "false", "no", "off"),
            )

        try:
            # Configure server parameters
            host = "0.0.0.0"
            port = self.config.sync_port

            # Log server startup details
            protocol = "TLS" if self.ssl_context else "TCP (unencrypted)"
            logger.info(f"Starting {protocol} server on {host}:{port}")

            if self.ssl_context:
                logger.debug(
                    f"SSL context settings: verify_mode={self.ssl_context.verify_mode}, "
                    f"check_hostname={self.ssl_context.check_hostname}"
                )

            self.server = await asyncio.start_server(
                self._handle_client,
                host,
                port,
                ssl=self.ssl_context,
                reuse_address=True,
                start_serving=True,
            )

            # Log server information
            if self.server.sockets:
                for sock in self.server.sockets:
                    addr = sock.getsockname()
                    logger.info(f"Server listening on {addr[0]}:{addr[1]} ({protocol})")

                    # Log socket details
                    logger.debug(
                        f"Socket family: {sock.family.name if hasattr(sock, 'family') else 'N/A'}"
                    )
                    logger.debug(
                        f"Socket type: {sock.type.name if hasattr(sock, 'type') else 'N/A'}"
                    )
                    logger.debug(
                        f"Socket protocol: {sock.proto if hasattr(sock, 'proto') else 'N/A'}"
                    )

        except OSError as e:
            logger.error(f"Failed to start server on port {self.config.sync_port}: {e}")
            if e.errno == 98:  # Address already in use
                logger.error(
                    f"Port {self.config.sync_port} is already in use. Please stop any other instances."
                )
            raise
        except ssl.SSLError as e:
            logger.error(f"SSL error while starting server: {e}")
            if "certificate verify failed" in str(e).lower():
                logger.error(
                    "Certificate verification failed. Please check your certificate and key files."
                )
            raise
        except Exception as e:
            logger.error(f"Unexpected error while starting server: {e}", exc_info=True)
            raise

        self.running = True

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
        client_writers = [client["writer"] for client in self.clients.values()]
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

    async def _handle_client(
        self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter
    ) -> None:
        """Handle a new client connection."""
        client_id = str(uuid.uuid4())
        client_addr = writer.get_extra_info("peername")

        # Log SSL/TLS information if available
        ssl_object = writer.get_extra_info("ssl_object")
        if ssl_object:
            try:
                cipher = ssl_object.cipher()
                if cipher:
                    logger.debug(
                        f"Client {client_addr} connected with {cipher[0]} {cipher[1]} {cipher[2]}"
                    )

                # Log client certificate if available
                cert = ssl_object.getpeercert()
                if cert:
                    logger.debug(
                        f"Client certificate subject: {cert.get('subject', {})}"
                    )
                    logger.debug(f"Client certificate issuer: {cert.get('issuer', {})}")
            except Exception as e:
                logger.warning(f"Could not get SSL client info: {e}", exc_info=True)

        logger.info(f"New connection from {client_addr} (ID: {client_id})")

        # Store client information
        self.clients[client_id] = {
            "reader": reader,
            "writer": writer,
            "addr": client_addr,
            "authenticated": False,
            "last_seen": asyncio.get_event_loop().time(),
            "ssl_enabled": ssl_object is not None,
            "cipher": (
                cipher[0] if ssl_object and (cipher := ssl_object.cipher()) else None
            ),
        }
        try:

            async def _handle_connection(self, reader, writer):
                client_addr = writer.get_extra_info("peername")
                logging.info(f"New connection from {client_addr}")

                try:
                    while True:
                        # Diagnostic Step 1: Log raw data
                        raw_data = await reader.read(4096)  # Read a chunk of data
                        if not raw_data:
                            logging.info(f"Connection closed by {client_addr}")
                            break

                        logging.debug(f"RAW DATA from {client_addr}: {raw_data!r}")

                        # We need to feed the raw data back into a stream for the protocol reader
                        # This is a bit of a hack for diagnostics. A better way would be to have the protocol class handle this.
                        stream_reader = asyncio.StreamReader()
                        stream_reader.feed_data(raw_data)
                        stream_reader.feed_eof()

                        try:
                            # Read message length (4 bytes)
                            header = await reader.readexactly(4)
                            if not header:
                                break  # Connection closed cleanly by peer

                            msg_length = struct.unpack(">I", header)[0]

                            # Read message data
                            data = await reader.readexactly(msg_length)

                            # Process the message
                            await self._process_message(data, client_id)

                        # Diagnostic Step 2: Catch-all exception handler
                        except Exception as e:
                            import traceback

                            tb_str = traceback.format_exc()
                            logging.error(
                                f"!!! EXCEPTION during message processing from {client_addr}: {e}\n{tb_str}"
                            )
                            # Send a generic error response if possible
                            error_response = Message(
                                type="ERROR",
                                payload={
                                    "error": "Internal server error",
                                    "details": str(e),
                                },
                            )
                            await self.protocol.write_message(error_response, writer)
                            # It's often best to close the connection on a processing error
                            break

                except ConnectionResetError:
                    logging.warning(f"Connection reset by {client_addr}")
                except Exception as e:
                    import traceback

                    tb_str = traceback.format_exc()
                    logging.error(
                        f"Unhandled connection-level error from {client_addr}: {e}\n{tb_str}"
                    )
                finally:
                    writer.close()
                    await writer.wait_closed()

            await _handle_connection(reader, writer)
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

    async def send_message(self, client_id: str, message: Message) -> None:
        """Send a message to a connected client.

        Args:
            client_id: The ID of the client to send the message to
            message: The message to send

        Raises:
            ValueError: If the client is not connected
            ConnectionError: If there's an error sending the message
        """
        if client_id not in self.clients:
            raise ValueError(f"Client {client_id} is not connected")

        try:
            await self._send_message(message, client_id)
        except Exception as e:
            logger.error(f"Error sending message to client {client_id}: {e}")
            raise ConnectionError(
                f"Failed to send message to client {client_id}: {e}"
            ) from e

    async def _send_message(self, message: Message, client_id: str) -> None:
        """Send a message to a specific client.

        Args:
            message: The message to send
            client_id: ID of the client to send the message to

        Note:
            The message will be signed with the protocol handler's secret key
            just before sending to ensure the signature is valid.
        """
        if client_id not in self.clients:
            logger.warning(
                f"Attempted to send message to disconnected client {client_id}"
            )
            return

        writer = self.clients[client_id]["writer"]
        try:
            # Ensure the message is signed with the current secret key
            if not message.signature and self.handler.secret_key:
                message.sign(self.handler.secret_key)
                logger.debug(
                    f"Signed message {message.message_id} before sending to {client_id}"
                )

            data = message.to_bytes()
            # Prepend message length
            writer.write(struct.pack("!I", len(data)))
            writer.write(data)
            await writer.drain()
            logger.debug(f"Sent {message.message_type.name} to {client_id}")
        except (ConnectionResetError, BrokenPipeError):
            logger.warning(
                f"Connection lost with client {client_id} while sending message."
            )
            # The connection is closed, _handle_client will do the cleanup.
        except Exception as e:
            logger.error(f"Error sending message to {client_id}: {e}", exc_info=True)

    async def _send_error(
        self,
        client_id: str,
        error: str,
        code: str = "generic_error",
        request_id: Optional[str] = None,
    ) -> None:
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
            writer = self.clients[client_id].get("writer")
            if writer and not writer.is_closing():
                logger.info(f"Closing connection for client {client_id}")
                writer.close()
                try:
                    await writer.wait_closed()
                except Exception as e:
                    logger.warning(
                        f"Error waiting for client {client_id} connection to close: {e}"
                    )

    async def _process_message(self, data: bytes, client_id: str) -> None:
        logger.debug(f"[SERVER] Received {len(data)} bytes from client {client_id}")
        logger.debug(f"[SERVER] Raw message (hex): {data.hex()}")
        logger.debug(
            f"[SERVER] Raw message (str): {data.decode('utf-8', errors='replace')}"
        )
        """Process an incoming message from a client."""
        message: Optional[Message] = None
        request_id: Optional[str] = None
        try:
            message = Message.from_bytes(data)
            logger.debug(
                f"Received {message.message_type.name} from {client_id} (ID: {message.message_id})"
            )

            # Extract request_id early for error reporting
            if isinstance(message.payload, dict):
                request_id = message.payload.get("request_id")

            # Only validate signature if authentication is required
            check_signature = (
                self.require_auth and message.message_type not in self.public_handlers
            )
            logger.debug(
                f"[SERVER] Validating message {message.message_id} from {client_id}"
            )
            logger.debug(
                f"[SERVER] Check signature: {check_signature}, Message type: {message.message_type}"
            )
            logger.debug(f"[SERVER] Message before validation: {message.__dict__}")

            is_valid, reason = self.handler.validate_message(
                message,
                check_signature=check_signature,
                check_replay=message.message_type not in self.public_handlers,
            )

            if not is_valid:
                logger.warning(f"[SERVER] Invalid message from {client_id}: {reason}")
                logger.warning(f"[SERVER] Message details: {message.__dict__}")
                logger.warning(
                    f"[SERVER] Message type: {message.message_type}, Checked signature: {check_signature}"
                )

                if message.signature:
                    logger.warning(f"[SERVER] Message signature: {message.signature}")
                    logger.warning(
                        f"[SERVER] Message data for signing: {message.to_dict()}"
                    )

                await self._send_error(client_id, f"Invalid message: {reason}")
                if "signature" in reason.lower():
                    logger.error(
                        f"[SERVER] Signature validation failed for message from {client_id}, closing connection"
                    )
                    await self._close_client_connection(client_id)
                return

            # Check authentication if required
            if (
                message.message_type not in self.public_handlers
                and self.require_auth
                and not self.clients[client_id]["authenticated"]
            ):
                logger.warning(
                    f"Unauthenticated access attempt from {client_id}. Closing connection."
                )
                await self._send_error(
                    client_id,
                    "Authentication required",
                    code="auth_required",
                    request_id=request_id,
                )
                return

            # Update last seen timestamp
            self.clients[client_id]["last_seen"] = asyncio.get_event_loop().time()

            # Log authentication status
            is_authenticated = self.clients[client_id].get("authenticated", False)
            logger.debug(
                f"[SERVER] Client {client_id} authenticated: {is_authenticated}"
            )
            logger.debug(
                f"[SERVER] Message type: {message.message_type}, requires auth: {message.message_type in self.authenticated_handlers}"
            )

            # Check if message requires authentication
            if (
                message.message_type in self.authenticated_handlers
                and not is_authenticated
            ):
                logger.warning(
                    f"[SERVER] Unauthenticated message {message.message_type} from {client_id}"
                )
                await self._send_error(
                    client_id, "Authentication required", "unauthorized"
                )
                return

            # Route to the appropriate handler
            handler = self.message_handlers.get(message.message_type)
            if handler:
                await handler(message, client_id)
            else:
                logger.warning(
                    f"No handler for message type {message.message_type.name} from {client_id}"
                )
                await self._send_error(
                    client_id,
                    f"Unsupported message type: {message.message_type.name}",
                    code="unsupported_type",
                    request_id=request_id,
                )

        except (json.JSONDecodeError, struct.error, ValueError) as e:
            logger.error(f"Failed to decode message from {client_id}: {e}")
            # Cannot get request_id if message is malformed
            await self._send_error(
                client_id, "Invalid message format", code="decode_error"
            )
        except Exception as e:
            # Use the request_id extracted earlier if available
            logger.exception(
                f"Error processing message from {client_id} (request_id: {request_id}): {e}"
            )
            await self._send_error(
                client_id,
                "Internal server error",
                code="internal_error",
                request_id=request_id,
            )

    async def _handle_auth_request(self, message: Message, client_id: str) -> None:
        """Handle an authentication request."""
        logger.debug(
            f"[SERVER] Handling auth request from client {client_id}. Message ID: {message.message_id}"
        )
        logger.debug(f"[SERVER] Auth request payload: {message.payload}")
        logger.debug(
            f"[SERVER] Handler type: {type(self.handler)}, Auth middleware present: {self.auth_middleware is not None}"
        )

        if not self.auth_middleware:
            logger.error(
                "Auth middleware not configured, authentication will fail. This is a server configuration issue."
            )
            # Instead of silently ignoring, send a proper error response
            response_payload = {
                "success": False,
                "error": "Server configuration error: Authentication middleware not configured",
                "request_id": message.message_id,
            }
            response = self.handler.create_message(
                MessageType.AUTH_RESPONSE,
                response_payload,
                request_id=message.message_id,
            )
            await self._send_message(response, client_id)
            return

        try:
            logger.debug(f"[SERVER] Invoking auth middleware for client {client_id}")
            # Detailed logging of the message before auth middleware processing
            logger.debug(f"[SERVER] Auth message contents: {message.to_dict()}")

            try:
                is_authenticated, auth_data = await self.auth_middleware(message)
                logger.debug(
                    f"[SERVER] Auth middleware result: is_authenticated={is_authenticated}, auth_data={auth_data}"
                )
            except Exception as auth_err:
                # Detailed exception logging for auth middleware
                logger.error(
                    f"[SERVER] Exception in auth middleware: {type(auth_err).__name__}: {str(auth_err)}"
                )
                logger.exception(
                    "[SERVER] Full auth middleware exception:", exc_info=auth_err
                )
                raise RuntimeError(
                    f"Auth middleware error: {type(auth_err).__name__}: {str(auth_err)}"
                ) from auth_err

            if is_authenticated:
                self.clients[client_id]["authenticated"] = True
                self.clients[client_id]["auth_data"] = auth_data
                response_payload = {
                    "success": True,
                    "auth_data": auth_data,
                    "request_id": message.message_id,
                }
                logger.info(f"Client {client_id} authenticated successfully.")
            else:
                response_payload = {
                    "success": False,
                    "error": "Invalid credentials",
                    "request_id": message.message_id,
                }
                logger.warning(
                    f"Client {client_id} authentication failed: invalid credentials"
                )
        except Exception as e:
            # Enhanced error logging with exception chain and message details
            logger.error(
                f"[SERVER] Error during authentication for client {client_id}: {type(e).__name__}: {str(e)}"
            )
            logger.exception(
                "[SERVER] Full authentication exception stack:", exc_info=True
            )

            # Include more detailed error information in response
            response_payload = {
                "success": False,
                "error": f"Server error: {type(e).__name__}: {str(e)}",
                "error_type": type(e).__name__,
                "request_id": message.message_id,
            }

        response = self.handler.create_message(
            MessageType.AUTH_RESPONSE,
            response_payload,
            request_id=message.message_id,  # Link response to request
        )

        logger.debug(
            f"[SERVER] Sending AUTH_RESPONSE to {client_id} for request {message.message_id}"
        )
        await self._send_message(response, client_id)

    async def _handle_sync_request(self, message: Message, client_id: str) -> None:
        """Handle a sync request from a client."""
        logger.debug(f"Received sync request from {client_id}")
        if self.handler:
            await self.handler.handle_message(
                message, self.clients[client_id]["writer"]
            )

    async def _handle_sync_data(self, message: Message, client_id: str) -> None:
        """Handle sync data from a client."""
        logger.debug(f"Received sync data from {client_id}")
        if self.handler:
            await self.handler.handle_message(
                message, self.clients[client_id]["writer"]
            )

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
                    logger.debug(
                        f"Could not send heartbeat to {client_id}, connection likely closed."
                    )
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
                if (
                    client_info
                    and (now - client_info["last_seen"]) > self.config.client_timeout
                ):
                    logger.info(f"Client {client_id} timed out. Disconnecting.")
                    writer = client_info["writer"]
                    if writer and not writer.is_closing():
                        writer.close()  # This will trigger the cleanup in _handle_client

    async def __aenter__(self):
        """Async context manager entry."""
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.stop()
