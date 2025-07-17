"""
Refactored TCP Client for LAN Sync

This is a refactored version of the TCPSyncClient class with improved
connection management and error handling.
"""

import asyncio
import json
import logging
import ssl
import struct
import time
import uuid
from typing import Any, Awaitable, Callable, Dict, List, Optional, Tuple

from trosyn_sync.services.lan_sync.config import LANConfig

# Import original types for type hints
from trosyn_sync.services.lan_sync.protocol import Message, MessageType, ProtocolHandler
from trosyn_sync.services.lan_sync.security import security

# Authentication callback type
AuthCallback = Callable[[], Awaitable[Optional[Dict[str, Any]]]]

logger = logging.getLogger(__name__)


class TCPSyncClient:
    """TCP client for handling secure sync operations between nodes."""

    def __init__(
        self,
        config: LANConfig,
        handler: ProtocolHandler,
        auth_callback: Optional[AuthCallback] = None,
        auto_reconnect: bool = True,
        require_auth: bool = True,
        verify_ssl: Optional[bool] = None,
    ):
        """Initialize the TCP sync client.

        Args:
            config: LAN configuration
            handler: Protocol handler for message processing
            auth_callback: Optional callback to get authentication data
            auto_reconnect: Whether to automatically reconnect on connection loss
            require_auth: Whether to require authentication for messages
            verify_ssl: Whether to verify SSL certificates. If None, uses TROSYNC_VERIFY_SSL env var.
        """
        self.config = config
        self.handler = handler
        self.auth_callback = auth_callback
        self.auto_reconnect = auto_reconnect
        self.require_auth = require_auth

        # Connection state
        self.reader: Optional[asyncio.StreamReader] = None
        self.writer: Optional[asyncio.StreamWriter] = None
        self.connected = False
        self.authenticated = False
        self.auth_data: Optional[Dict[str, Any]] = None
        self._handling_connection_error = (
            False  # Flag to prevent reentrant error handling
        )

        # Tasks and timers
        self.reconnect_task: Optional[asyncio.Task] = None
        self.heartbeat_task: Optional[asyncio.Task] = None
        self.receive_task: Optional[asyncio.Task] = None
        self.reconnect_delay = (
            2  # Initial reconnect delay in seconds (reduced from 5s for tests)
        )
        self._tasks: List[asyncio.Task] = []  # Track all background tasks

        # SSL context - use the new secure context with configurable verification
        self.ssl_context = None
        if self.config.use_ssl:
            self.ssl_context = security.get_ssl_context(
                server_side=False,
                verify_cert=verify_ssl if verify_ssl is not None else None,
            )
            logger.debug(
                f"Initialized SSL context with verify_mode={self.ssl_context.verify_mode}"
            )

        # Register message handlers
        self.message_handlers = {
            MessageType.AUTH_RESPONSE: self._handle_auth_response,
            MessageType.SYNC_REQUEST: self._handle_sync_request,
            MessageType.SYNC_RESPONSE: self._handle_sync_response,
            MessageType.SYNC_DATA: self._handle_sync_data,
            MessageType.SYNC_ACK: self._handle_ack,
            MessageType.HEARTBEAT: self._handle_heartbeat,
            MessageType.ERROR: self._handle_error,
        }

        # Pending requests and state
        self.pending_requests: Dict[str, asyncio.Future] = {}
        self.connection_handlers: List[Callable[[bool], None]] = []
        self.auth_handlers: List[Callable[[bool], None]] = []
        self._connected_event = asyncio.Event()

    async def _cancel_reconnect_task(self) -> None:
        """Cancel any pending reconnect task."""
        if self.reconnect_task and not self.reconnect_task.done():
            self.reconnect_task.cancel()
            try:
                await self.reconnect_task
            except asyncio.CancelledError:
                pass
            self.reconnect_task = None
            logger.debug("Cancelled pending reconnect task")

    async def _reset_connection(self) -> None:
        """Reset connection state and cancel any pending tasks."""
        self.connected = False
        self.authenticated = False
        self.reader = None
        self.writer = None
        self._connected_event.clear()
        await self._cancel_tasks()

    async def _cancel_tasks(self) -> None:
        """Cancel all background tasks safely without recursion."""
        if not self._tasks:
            return

        # Create a copy of tasks to avoid modification during iteration
        tasks = [t for t in self._tasks if not t.done()]

        # Clear the task list first to prevent recursion
        self._tasks.clear()

        # Cancel all tasks
        for task in tasks:
            if not task.done():
                task.cancel()

        # Wait for all tasks to complete with a timeout
        if tasks:
            try:
                await asyncio.wait_for(
                    asyncio.gather(*tasks, return_exceptions=True), timeout=1.0
                )
            except asyncio.TimeoutError:
                logger.warning("Timeout waiting for tasks to cancel")

        logger.debug(f"Cancelled {len(tasks)} background tasks")

    async def connect(
        self, host: str, port: int, timeout: Optional[float] = None
    ) -> bool:
        """Connect to a remote TCP server with SSL/TLS.

        Args:
            host: Server hostname or IP address
            port: Server port

        Returns:
            bool: True if connection and authentication (if required) were successful

        Raises:
            ConnectionError: If connection or authentication fails
        """
        if self.connected:
            logger.warning("Already connected to a server")
            return True

        try:
            # Store the connection details for potential reconnection
            self._last_host = host
            self._last_port = port

            # Cancel any existing reconnect task
            await self._cancel_reconnect_task()

            # Reset connection state
            await self._reset_connection()

            # Clear the connected event - will be set after authentication
            self._connected_event.clear()

            # Configure SSL context if needed
            ssl_context = self.ssl_context if self.config.use_ssl else None

            # Store host and port for potential reconnection
            self._last_host = host
            self._last_port = port

            # Log connection attempt
            protocol = "SSL/TLS" if self.config.use_ssl else "plaintext"
            logger.info(f"Attempting to connect to {host}:{port} with {protocol}...")

            # Enable SSL debug logging if needed
            if self.config.use_ssl and self.ssl_context:
                logger.debug("SSL context settings:")
                logger.debug(f"  Protocol: {self.ssl_context.protocol}")
                logger.debug(f"  Verify mode: {self.ssl_context.verify_mode}")
                logger.debug(f"  Check hostname: {self.ssl_context.check_hostname}")

            # Create connection with timeout
            connect_timeout = (
                timeout if timeout is not None else self.config.connect_timeout
            )
            try:
                conn_args = {"host": host, "port": port, "ssl": ssl_context}
                if ssl_context:
                    conn_args["ssl_handshake_timeout"] = 10.0

                connect_coro = asyncio.open_connection(**conn_args)
                self.reader, self.writer = await asyncio.wait_for(
                    connect_coro, timeout=connect_timeout
                )
            except (asyncio.TimeoutError, OSError) as e:
                raise ConnectionError(f"Connection to {host}:{port} failed: {e}") from e

            # Connection established
            self.connected = True
            self.authenticated = False
            # _connected_event will be set after authentication

            # Start background tasks
            self._start_background_tasks()

            # Log connection details
            logger.info(f"Connected to {host}:{port}")

            # Log SSL/TLS connection details if using SSL
            if self.config.use_ssl and self.ssl_context and self.writer:
                try:
                    ssl_object = self.writer.get_extra_info("ssl_object")
                    if ssl_object:
                        # Log cipher information
                        cipher = ssl_object.cipher()
                        if cipher:
                            logger.info(
                                f"TLS connection using {cipher[0]} with {cipher[2]} encryption"
                            )

                        # Log certificate details
                        cert = ssl_object.getpeercert()
                        if cert:
                            logger.debug(
                                f"Server certificate subject: {cert.get('subject', {})}"
                            )
                            logger.debug(
                                f"Server certificate issuer: {cert.get('issuer', {})}"
                            )
                            logger.debug(
                                f"Server certificate version: {cert.get('version', 'N/A')}"
                            )
                except Exception as e:
                    logger.warning(f"Failed to log SSL details: {e}")

            # Authenticate if required
            if self.require_auth and self.auth_callback:
                auth_success = await self._authenticate()
                if not auth_success:
                    raise ConnectionError("Authentication failed")

            # Notify connection handlers
            self._notify_connection_handlers(True)
            return True

        except Exception as e:
            await self._handle_connection_error()
            if isinstance(e, ConnectionError):
                raise
            raise ConnectionError(f"Connection failed: {e}") from e

    async def _authenticate(self) -> bool:
        """
        Perform authentication with the server.

        Returns:
            bool: True if authentication was successful, False otherwise
        """
        if not self.auth_callback:
            logger.warning("No auth callback provided, skipping authentication")
            return True  # If no auth callback, consider authentication successful

        try:
            # Get auth data from the callback
            auth_data = await self.auth_callback()
            if not auth_data:
                logger.error("Authentication callback returned no data")
                return False

            # Create a future to wait for the auth response
            future = asyncio.Future()

            # Create and send auth request with a unique message ID
            auth_message = Message(
                message_type=MessageType.AUTH_REQUEST,
                source={
                    "node_id": self.config.node_id,
                    "node_name": self.config.node_name,
                },
                payload=auth_data,
            )

            # Store the future with the message's ID for response matching
            self.pending_requests[auth_message.message_id] = future

            # Send the auth request
            await self.send_message(auth_message)

            # Wait for auth response with timeout
            try:
                # Wait for the auth response with a timeout
                auth_response = await asyncio.wait_for(future, timeout=10.0)

                if auth_response.get("status") == "success":
                    self.authenticated = True
                    self.auth_data = auth_response
                    logger.info("Authentication successful")
                    # Set the connected event to indicate full readiness
                    self._connected_event.set()
                    logger.debug(
                        "Connection readiness event set after successful authentication"
                    )
                    self._notify_auth_handlers(True, auth_response)
                    return True
                else:
                    error_msg = auth_response.get("error", "Authentication failed")
                    logger.error(f"Authentication failed: {error_msg}")
                    self._notify_auth_handlers(False, {"error": error_msg})
                    return False

            except asyncio.TimeoutError:
                logger.error("Authentication timed out")
                self._notify_auth_handlers(False, {"error": "Authentication timed out"})
                return False

        except Exception as e:
            logger.error(f"Error during authentication: {e}", exc_info=True)
            self._notify_auth_handlers(False, {"error": str(e)})
            return False

    async def _handle_auth_response(self, message: Message):
        """Handle authentication response from server."""
        logger.debug(f"Received auth response: {message.payload}")
        request_id = message.request_id
        if request_id and request_id in self.pending_requests:
            future = self.pending_requests.pop(request_id)
            if not future.done():
                if message.payload.get("status") == "success":
                    # Mark authentication as successful
                    self.authenticated = True
                    # Set the connected event to indicate full readiness
                    self._connected_event.set()
                    logger.debug(
                        "Connection readiness event set after successful authentication response"
                    )
                    future.set_result(message)
                else:
                    error = ConnectionRefusedError(
                        message.payload.get("message", "Authentication failed")
                    )
                    future.set_exception(error)

    async def _handle_error(self, message: Message):
        """Handle error messages from the server."""
        error_payload = message.payload or {}
        error_message = error_payload.get(
            "error", error_payload.get("message", "Unknown error")
        )
        error_code = error_payload.get("code", "UNKNOWN")
        logger.error(
            f"Received error from server: {error_message} (Code: {error_code})"
        )

        # Safely check for request_id in payload since Message object doesn't have this attribute
        request_id = error_payload.get("request_id")
        if request_id and request_id in self.pending_requests:
            future = self.pending_requests.pop(request_id)
            if not future.done():
                future.set_exception(Exception(f"{error_code}: {error_message}"))

    async def _handle_sync_request(self, message: Message) -> None:
        """Handle a sync request from the server."""
        logger.info("Received sync request from server")
        if self.handler:
            await self.handler.handle_message(message, self.writer)

    async def _handle_sync_data(self, message: Message) -> None:
        """Handle sync data from the server."""
        logger.info("Received sync data from server")
        if self.handler:
            await self.handler.handle_message(message, self.writer)

    async def _handle_ack(self, message: Message) -> None:
        """Handle acknowledgment message from server."""
        if not message.payload:
            logger.debug("Received empty ACK")
            return

        ack_id = message.payload.get("ack_id")
        if not ack_id:
            logger.debug("Received ACK without ack_id")
            return

        logger.debug(f"Received ACK for message {ack_id}")

        if ack_id in self.pending_requests:
            future = self.pending_requests.pop(ack_id)
            if not future.done():
                future.set_result(message.payload)

    async def _handle_sync_response(self, message: Message) -> None:
        """Handle sync response from server."""
        if not message.payload:
            logger.warning("Received empty sync response")
            return

        logger.info(f"Received sync response: {message.payload}")

        sync_id = message.payload.get("sync_id")
        status = message.payload.get("status")

        if not sync_id:
            logger.warning("Sync response missing sync_id")
            return

        if sync_id in self.pending_requests:
            future = self.pending_requests.pop(sync_id)
            if not future.done():
                if status == "success":
                    future.set_result(message.payload)
                else:
                    error_msg = message.payload.get("error", "Sync failed")
                    future.set_exception(Exception(f"Sync failed: {error_msg}"))

    async def _handle_heartbeat(self, message: Message) -> None:
        """Handle heartbeat message from server."""
        logger.debug("Received heartbeat from server. No action needed.")

    async def _handle_connection_error(self) -> None:
        """Handle connection errors and schedule reconnection if enabled."""
        logger.debug("Handling connection error.")

        # Only proceed if not already handling a connection error
        if (
            hasattr(self, "_handling_connection_error")
            and self._handling_connection_error
        ):
            logger.debug("Already handling a connection error, skipping")
            return

        self._handling_connection_error = True
        try:
            await self._reset_connection()
            if self.auto_reconnect:
                logger.debug("Scheduling reconnection...")
                self._reconnect()
            else:
                logger.debug("Auto-reconnect is disabled, not reconnecting")
        except Exception as e:
            logger.error(f"Error in connection error handler: {e}", exc_info=True)
        finally:
            self._handling_connection_error = False

    def _start_background_tasks(self) -> None:
        """Start background tasks for reading messages and sending heartbeats."""
        if not self.connected:
            logger.warning("Cannot start background tasks: not connected.")
            return

        # Start message reader task
        receive_task = asyncio.create_task(self._receive_messages())
        self._tasks.append(receive_task)
        receive_task.add_done_callback(self._handle_task_done_callback)

        # Start heartbeat task if enabled
        if self.config.heartbeat_interval > 0:
            heartbeat_task = asyncio.create_task(self._send_heartbeats())
            self._tasks.append(heartbeat_task)
            heartbeat_task.add_done_callback(self._handle_task_done_callback)

        logger.debug("Started background tasks.")

    async def _receive_messages(self) -> None:
        """Continuously read messages from the server."""
        while self.connected and self.reader:
            try:
                # Read message length (4 bytes, big-endian)
                len_data = await self.reader.readexactly(4)
                msg_len = struct.unpack(">I", len_data)[0]

                # Read message data
                data = await self.reader.readexactly(msg_len)

                # Deserialize message
                message = Message.from_bytes(data)
                logger.debug(f"Received message: {message.message_type.name}")

                # Dispatch message to handler
                if handler := self.message_handlers.get(message.message_type):
                    await handler(message)
                else:
                    logger.warning(
                        f"No handler for message type: {message.message_type}"
                    )

            except (
                asyncio.IncompleteReadError,
                ConnectionResetError,
                BrokenPipeError,
            ) as e:
                logger.warning(f"Connection lost while reading: {e}")
                await self._handle_connection_error()
                break
            except Exception as e:
                logger.exception(f"Unexpected error in message receive loop: {e}")
                await self._handle_connection_error()
                break
        logger.debug("Message receive loop finished.")

    async def _send_heartbeats(self) -> None:
        """Send periodic heartbeats to the server."""
        while self.connected:
            try:
                await asyncio.sleep(self.config.heartbeat_interval)
                if self.connected:
                    heartbeat_message = Message(
                        message_type=MessageType.HEARTBEAT,
                        sender_id=self.config.node_id,
                        timestamp=datetime.utcnow().isoformat(),
                    )
                    await self.send_message(heartbeat_message)
                    logger.debug("Sent heartbeat.")
            except asyncio.CancelledError:
                logger.debug("Heartbeat task cancelled")
                break
            except Exception as e:
                logger.error(f"Error sending heartbeat: {e}", exc_info=True)
                # If we can't send heartbeats, there might be a connection issue
                await self._handle_connection_error()
                break
        logger.debug("Heartbeat task finished.")

    def _reconnect(self) -> None:
        """Schedule reconnection with exponential backoff.

        This method creates a background task that attempts to reconnect to the
        server multiple times with increasing delay between attempts.
        """

        async def reconnect_task() -> None:
            max_attempts = 5
            base_delay = self.reconnect_delay
            attempt = 0

            # Cancel any existing reconnect task
            await self._cancel_reconnect_task()

            while not self.connected and attempt < max_attempts:
                attempt += 1
                current_delay = base_delay * (2 ** (attempt - 1))  # Exponential backoff

                logger.info(
                    f"Reconnection attempt {attempt}/{max_attempts} in {current_delay}s"
                )
                await asyncio.sleep(current_delay)

                if hasattr(self, "_last_host") and hasattr(self, "_last_port"):
                    try:
                        logger.info(
                            f"Trying to connect to {self._last_host}:{self._last_port}"
                        )
                        await self.connect(self._last_host, self._last_port)
                        if self.connected:
                            logger.info("Reconnect successful!")
                            self._notify_connection_handlers(True)
                            return  # Successfully reconnected
                        else:
                            logger.warning(
                                "Connection attempt did not result in a connected state"
                            )
                    except ConnectionError as e:
                        logger.error(f"Reconnect attempt {attempt} failed: {e}")
                        if attempt >= max_attempts:
                            logger.error(
                                "Max reconnection attempts reached. Giving up."
                            )
                            self._notify_connection_handlers(False)
                    except Exception as e:
                        logger.error(
                            f"Unexpected error during reconnection: {e}", exc_info=True
                        )
                        if attempt >= max_attempts:
                            logger.error(
                                "Max reconnection attempts reached due to unexpected error."
                            )
                            self._notify_connection_handlers(False)
                else:
                    logger.error(
                        "Cannot reconnect: No previous connection details available"
                    )
                    self._notify_connection_handlers(False)
                    break

            if not self.connected and attempt >= max_attempts:
                logger.error("Giving up after max reconnection attempts")
                self._notify_connection_handlers(False)

        self.reconnect_task = asyncio.create_task(reconnect_task())
        self._tasks.append(self.reconnect_task)
        self.reconnect_task.add_done_callback(self._handle_task_done_callback)

    async def disconnect(self) -> None:
        """Disconnect from the server and clean up resources."""
        logger.info("Disconnecting from server...")
        self.auto_reconnect = False  # Prevent reconnection during manual disconnect
        await self._cancel_reconnect_task()
        await self._reset_connection()
        logger.info("Disconnected successfully.")

    async def send_message(self, message: Message) -> None:
        """Send a message to the server, with signing if configured."""
        if not self.connected or not self.writer:
            raise ConnectionError("Not connected to a server")

        # Wait for connection to be fully established (including authentication if required)
        # Skip this check for authentication messages to avoid circular dependency
        if (
            message.message_type != MessageType.AUTH_REQUEST
            and not self._connected_event.is_set()
        ):
            try:
                await asyncio.wait_for(
                    self._connected_event.wait(),
                    timeout=10.0,  # Reasonable timeout for connection to be ready
                )
            except asyncio.TimeoutError:
                raise ConnectionError("Timed out waiting for connection to be ready")

        try:
            # Sign the message if a secret key is available
            if self.config.shared_secret:
                message.sign(self.config.shared_secret)

            # Serialize the message
            data = message.to_bytes()

            # Prepend message length (4 bytes, big-endian)
            len_data = struct.pack(">I", len(data))

            # Send data
            self.writer.write(len_data + data)
            await self.writer.drain()
            logger.debug(f"Sent message: {message.message_type.name}")

        except (ConnectionResetError, BrokenPipeError) as e:
            logger.warning(f"Connection lost while sending message: {e}")
            await self._handle_connection_error()
            raise ConnectionError("Connection lost") from e
        except Exception:
            logger.exception("Failed to send message")
            raise

    def _notify_connection_handlers(self, connected: bool):
        """Notify all connection state change handlers."""
        for handler in self.connection_handlers:
            try:
                handler(connected)
            except Exception as e:
                logger.error(f"Error in connection handler: {e}")

    def _notify_auth_handlers(
        self, authenticated: bool, auth_data: Optional[Dict[str, Any]] = None
    ):
        """Notify all authentication state change handlers."""
        for handler in self.auth_handlers:
            try:
                handler(authenticated, auth_data)
            except Exception as e:
                logger.error(f"Error in auth handler: {e}")

    def _handle_task_done_callback(self, task: asyncio.Task) -> None:
        """Synchronous callback that handles task completion.

        This is called synchronously when a task completes, so we need to be careful
        about not doing too much work here to avoid blocking the event loop.
        """
        try:
            # Remove the task from our tracking list if it's still there
            # Use a try/except since the list might be modified during iteration
            try:
                if task in self._tasks:
                    self._tasks.remove(task)
            except (ValueError, RuntimeError):
                # Task was already removed or list modified during iteration
                pass

            # Check for exceptions in the task
            if task.done() and not task.cancelled():
                try:
                    task.result()  # This will raise any exceptions from the task
                except Exception as e:
                    logger.error(f"Task failed: {e}", exc_info=True)
        except Exception as e:
            logger.error(f"Error in task done callback: {e}", exc_info=True)

    async def _handle_task_done(self, task: asyncio.Task) -> None:
        """Handle task completion and clean up."""
        try:
            # Get the result to raise any exceptions
            task.result()
        except asyncio.CancelledError:
            pass  # Task was cancelled, this is expected
        except Exception as e:
            logger.error(f"Background task failed: {e}", exc_info=True)
        finally:
            # Remove the task from our tracking list
            if task in self._tasks:
                self._tasks.remove(task)

    async def _cancel_all_tasks(self) -> None:
        """Cancel all running background tasks safely.

        This method handles task cancellation in a way that prevents recursion
        and ensures all tasks are properly cleaned up.
        """
        if not self._tasks:
            return

        # Make a copy of tasks and clear the original list first to prevent recursion
        tasks_to_cancel = []
        while self._tasks:
            task = self._tasks.pop()
            if not task.done():
                tasks_to_cancel.append(task)

        if not tasks_to_cancel:
            return

        logger.debug(f"Cancelling {len(tasks_to_cancel)} background tasks")

        # Cancel all tasks
        for task in tasks_to_cancel:
            try:
                task.cancel()
            except Exception as e:
                logger.warning(f"Error cancelling task: {e}")

        # Wait for tasks to complete with a timeout
        try:
            await asyncio.wait(
                tasks_to_cancel, timeout=1.0, return_when=asyncio.ALL_COMPLETED
            )
        except Exception as e:
            logger.warning(f"Error waiting for tasks to complete: {e}")

        # Clean up any remaining tasks
        for task in tasks_to_cancel:
            if not task.done():
                try:
                    # Forcefully cancel if still running
                    task.get_loop().call_soon(task.cancel)
                except Exception as e:
                    logger.debug(f"Error force-cancelling task: {e}")

        logger.debug("All background tasks cancelled")

    async def _reset_connection(self) -> None:
        """Reset connection state and clean up resources."""
        was_connected = self.connected
        was_authenticated = self.authenticated

        # Reset state first to prevent new operations
        self.connected = False
        self.authenticated = False
        self._connected_event.clear()

        # Close existing connection
        if self.writer and not self.writer.is_closing():
            try:
                self.writer.close()
                await asyncio.wait_for(self.writer.wait_closed(), timeout=2.0)
            except (asyncio.TimeoutError, Exception) as e:
                logger.debug(f"Error closing writer: {e}")

        # Clear connection objects
        self.reader = None
        self.writer = None

        # Cancel all background tasks
        await self._cancel_all_tasks()

        # Cancel pending requests with proper error
        for future in self.pending_requests.values():
            if not future.done():
                future.set_exception(ConnectionError("Connection lost"))
        self.pending_requests.clear()

        # Notify handlers if state changed
        if was_connected:
            try:
                self._notify_connection_handlers(False)
            except Exception as e:
                logger.error(f"Error notifying connection handlers: {e}")

        if was_authenticated:
            try:
                self._notify_auth_handlers(False, {"message": "Connection lost"})
            except Exception as e:
                logger.error(f"Error notifying auth handlers: {e}")

        logger.debug("Connection reset complete")
