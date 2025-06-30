"""
TCP Client for LAN Sync

This module implements a TCP client for handling sync operations between nodes.
"""
import asyncio
import json
import logging
import struct
import ssl
import uuid
from typing import Dict, Optional, Callable, Awaitable, Any, List, Tuple

from .protocol import Message, MessageType, ProtocolHandler
from .config import LANConfig
from .security import security

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
        verify_ssl: Optional[bool] = None
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
        
        # Tasks and timers
        self.reconnect_task: Optional[asyncio.Task] = None
        self.heartbeat_task: Optional[asyncio.Task] = None
        self.receive_task: Optional[asyncio.Task] = None
        self.reconnect_delay = 5  # Initial reconnect delay in seconds
        self._tasks: List[asyncio.Task] = []  # Track all background tasks
        
        # SSL context - use the new secure context with configurable verification
        self.ssl_context = None
        if self.config.use_ssl:
            self.ssl_context = security.get_ssl_context(
                server_side=False,
                verify_cert=verify_ssl if verify_ssl is not None else None
            )
            logger.debug(f"Initialized SSL context with verify_mode={self.ssl_context.verify_mode}")
        
        # Register message handlers
        self.message_handlers = {
            MessageType.AUTH_RESPONSE: self._handle_auth_response,
            MessageType.SYNC_REQUEST: self._handle_sync_request,
            MessageType.SYNC_RESPONSE: self._handle_sync_response,
            MessageType.SYNC_DATA: self._handle_sync_data,
            MessageType.SYNC_ACK: self._handle_ack,
            MessageType.HEARTBEAT: self._handle_heartbeat,
            MessageType.ERROR: self._handle_error
        }
        
        # Pending requests and state
        self.pending_requests: Dict[str, asyncio.Future] = {}
        self.connection_handlers: List[Callable[[bool], None]] = []
        self.auth_handlers: List[Callable[[bool], None]] = []
    
    async def connect(self, host: str, port: int) -> bool:
        """Connect to a remote TCP server with SSL/TLS.
        
        Args:
            host: Server hostname or IP address
            port: Server port
            
        Returns:
            bool: True if connection was successful, False otherwise
        """
        if self.connected:
            logger.warning("Already connected to a server")
            return True
            
        try:
            # Cancel any existing reconnect task
            if self.reconnect_task and not self.reconnect_task.done():
                self.reconnect_task.cancel()
                try:
                    await self.reconnect_task
                except asyncio.CancelledError:
                    pass
            
            # Reset connection state
            await self._reset_connection()
            
            # Create SSL context if not provided
            if self.config.use_ssl and self.ssl_context is None:
                logger.info("Creating secure SSL context for client")
                self.ssl_context = security.get_ssl_context(
                    server_side=False,
                    verify_cert=os.getenv('TROSYNC_VERIFY_SSL', '').lower() not in ('0', 'false', 'no', 'off')
                )
                logger.debug(f"Configured SSL context with verify_mode={self.ssl_context.verify_mode}")
            
            protocol = "SSL/TLS" if self.config.use_ssl else "TCP (unencrypted)"
            logger.info(f"Attempting to connect to {host}:{port} with {protocol}...")

            # Enable SSL debug logging
            if self.ssl_context:
                logger.debug("SSL context settings:")
                logger.debug(f"  Protocol: {self.ssl_context.protocol}")
                logger.debug(f"  Verify mode: {self.ssl_context.verify_mode}")
                logger.debug(f"  Check hostname: {self.ssl_context.check_hostname}")
            
            # Enable SSL debug logging
            logger.debug("Initiating connection...")
            logger.debug(f"Target host: {host}:{port}")
            logger.debug(f"SSL context: {self.ssl_context}")
            
            # Connect with timeout
            try:
                conn_params = {'host': host, 'port': port}
                if self.config.use_ssl:
                    conn_params['ssl'] = self.ssl_context
                    conn_params['server_hostname'] = host
                    conn_params['ssl_handshake_timeout'] = 10.0

                self.reader, self.writer = await asyncio.wait_for(
                    asyncio.open_connection(**conn_params),
                    timeout=10.0
                )

                # Log connection details
                protocol = "SSL/TLS" if self.config.use_ssl else "TCP"
                logger.info(f"{protocol} connection to {host}:{port} established successfully.")

                if self.config.use_ssl:
                    ssl_object = self.writer.get_extra_info('ssl_object')
                    if ssl_object:
                        try:
                            cipher = ssl_object.cipher()
                            if cipher:
                                logger.info(f"SSL/TLS connection established: {cipher[0]} {cipher[1]} {cipher[2]}")
                            peer_cert = ssl_object.getpeercert()
                            if peer_cert:
                                logger.debug(f"Server certificate: {peer_cert}")
                        except Exception as e:
                            logger.warning(f"Could not get SSL connection details: {e}")

            except ssl.SSLError as e:
                logger.error("SSL handshake failed with the following error:")
                logger.error(f"Error type: {type(e).__name__}")
                logger.error(f"Error message: {e}")
                if hasattr(e, 'library_name') and hasattr(e, 'reason'):
                    logger.error(f"SSL Library: {e.library_name}")
                    logger.error(f"SSL Reason: {e.reason}")
                if hasattr(e, 'verify_message'):
                    logger.error(f"Verify message: {e.verify_message}")
                if hasattr(e, 'verify_code'):
                    logger.error(f"Verify code: {e.verify_code}")
                logger.error("SSL/TLS connection failed. Please check server certificate and SSL configuration.")
                raise
                    
            except asyncio.TimeoutError as e:
                logger.error(f"Connection attempt timed out after 10 seconds: {e}")
                raise
            except ConnectionRefusedError as e:
                logger.error(f"Connection refused by the server at {host}:{port}: {e}")
                raise
            except OSError as e:
                logger.error(f"Network error while connecting to {host}:{port}: {e}")
                if hasattr(e, 'winerror') and e.winerror:
                    logger.error(f"Windows error code: {e.winerror}")
                raise
            except Exception as e:
                logger.error(f"Unexpected error during connection: {e}", exc_info=True)
                raise
            
            # Log SSL/TLS connection details
            if self.config.use_ssl and self.ssl_context:
                ssl_object = self.writer.get_extra_info('ssl_object')
                if ssl_object:
                    try:
                        # Log cipher information
                        cipher = ssl_object.cipher()
                        if cipher:
                            logger.info(f"TLS connection using {cipher[0]} with {cipher[2]} encryption")
                        
                        # Log certificate details
                        cert = ssl_object.getpeercert()
                        if cert:
                            logger.debug(f"Server certificate subject: {cert.get('subject', {})}")
                            logger.debug(f"Server certificate issuer: {cert.get('issuer', {})}")
                            logger.debug(f"Server certificate version: {cert.get('version', 'N/A')}")
                            
                            # Log certificate expiration
                            not_after = dict(x[0] for x in cert.get('notAfter', []))
                            if not_after:
                                logger.debug(f"Certificate valid until: {not_after}")
                                
                    except Exception as e:
                        logger.warning(f"Could not get SSL connection details: {e}", exc_info=True)
            
            self.connected = True
            logger.info(f"Connected to {host}:{port}")
            
            # Start the receive and heartbeat tasks
            self.receive_task = asyncio.create_task(self._receive_messages())
            self.heartbeat_task = asyncio.create_task(self._send_heartbeats())
            
            # Track both tasks
            self._tasks.extend([self.receive_task, self.heartbeat_task])
            
            # Add done callbacks to clean up
            for task in [self.receive_task, self.heartbeat_task]:
                task.add_done_callback(self._handle_task_done)
            
            # Notify connection handlers
            self._notify_connection_handlers(True)
            
            # Start authentication if needed
            if self.auth_callback and not self.authenticated:
                await self._authenticate()
            
            return True
            
        except (ConnectionRefusedError, OSError, ssl.SSLError) as e:
            logger.error(f"Failed to connect to {host}:{port}: {e}")
            await self._handle_connection_error()
            return False
    
    async def _cancel_tasks(self) -> None:
        """Cancel all background tasks."""
        tasks = []
        
        if self.heartbeat_task and not self.heartbeat_task.done():
            tasks.append(self.heartbeat_task)
            self.heartbeat_task.cancel()
            
        if self.receive_task and not self.receive_task.done():
            tasks.append(self.receive_task)
            self.receive_task.cancel()
            
        if self.reconnect_task and not self.reconnect_task.done():
            tasks.append(self.reconnect_task)
            self.reconnect_task.cancel()
        
        # Cancel any other tracked tasks
        for task in self._tasks[:]:
            if not task.done():
                tasks.append(task)
                task.cancel()
        
        # Wait for all tasks to complete
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        
        # Clear the task list
        self._tasks.clear()
    
    async def disconnect(self) -> None:
        """Disconnect from the server and clean up resources."""
        if not self.connected and not self.writer:
            return
            
        logger.info("Disconnecting from server...")
        self.connected = False
        
        # Cancel all background tasks
        await self._cancel_tasks()
        
        # Close the connection
        if self.writer:
            self.writer.close()
            try:
                await self.writer.wait_closed()
            except Exception as e:
                logger.debug(f"Error closing connection: {e}")
            self.writer = None
        
        self.reader = None
        self.authenticated = False
        self.auth_data = None
    
    async def _receive_messages(self) -> None:
        """Continuously receive and process messages from the server."""
        while self.connected and self.reader and not self.reader.at_eof():
            try:
                # Read message length (4 bytes)
                header = await self.reader.readexactly(4)
                if not header:
                    break
                    
                msg_length = struct.unpack('>I', header)[0]
                
                # Read message data
                data = await self.reader.readexactly(msg_length)
                
                # Process the message
                await self._process_message(data)
                
            except (asyncio.IncompleteReadError, ConnectionResetError):
                logger.info("Connection closed by server")
                break
            except Exception as e:
                logger.error(f"Error receiving message: {e}")
                break
        
        self.connected = False
        logger.info("Disconnected from server")
    
    async def _process_message(self, data: bytes) -> None:
        """Process an incoming message from the server."""
        try:
            # Parse the message first to get basic information
            try:
                message = Message.from_bytes(data)
                logger.debug(f"Received {message.message_type.name} from server (ID: {message.message_id})")
            except (json.JSONDecodeError, struct.error, ValueError) as e:
                logger.error(f"Failed to decode message: {e}")
                return

            # For error messages, extract the request_id before any validation
            request_id = None
            if message.message_type == MessageType.ERROR and isinstance(message.payload, dict):
                request_id = message.payload.get('request_id')
                error_msg = message.payload.get('error', 'Unknown server error')
                
                # If this is an error for a pending request, handle it immediately
                if request_id and request_id in self.pending_requests:
                    future = self.pending_requests.pop(request_id)
                    if not future.done():
                        future.set_exception(ConnectionAbortedError(f"Server error: {error_msg}"))
                        logger.debug(f"Set exception for pending request {request_id}: {error_msg}")
                    return

            # For non-error messages or errors without a request_id, do validation
            if message.message_type != MessageType.ERROR:
                # Skip signature check for non-error messages if auth is not required
                check_signature = self.require_auth
                is_valid, reason = self.handler.validate_message(message, check_signature=check_signature)
                if not is_valid:
                    logger.warning(f"Invalid message received from server: {reason}. Discarding.")
                    return

                # Check if this is a response to a pending request
                if isinstance(message.payload, dict):
                    request_id = message.payload.get('request_id')
                    if request_id and request_id in self.pending_requests:
                        future = self.pending_requests.pop(request_id)
                        if not future.done():
                            future.set_result(message)
                            logger.debug(f"Resolved pending request: {request_id}")
                        return  # The response has been handled

            # If not a pending response, route to a general message handler
            handler = self.message_handlers.get(message.message_type)
            if handler:
                await handler(message)
            elif message.message_type != MessageType.ERROR:  # Don't log for unhandled errors
                logger.warning(f"No handler for unsolicited message type: {message.message_type.name}")

        except Exception as e:
            logger.error(f"Error processing message: {e}", exc_info=True)
    
    async def _authenticate(self) -> None:
        """Authenticate with the server using the provided auth callback."""
        if not self.auth_callback or self.authenticated or not self.connected:
            logger.debug("Skipping authentication: callback=%s, authenticated=%s, connected=%s", 
                       bool(self.auth_callback), self.authenticated, self.connected)
            return
            
        try:
            # Generate a unique request ID for this authentication attempt
            request_id = str(uuid.uuid4())
            logger.debug(f"Starting authentication process (request_id: {request_id})")
            
            # Get authentication data from callback
            auth_data = await self.auth_callback()
            if not auth_data:
                logger.warning("No authentication data provided")
                self._notify_auth_handlers(False)
                return
            
            # Add request ID to auth data
            auth_data['request_id'] = request_id
            
            logger.debug("Sending authentication request with data: %s", 
                        {k: v for k, v in auth_data.items() if k != 'password'})
                
            # Create and send auth request
            auth_request = self.handler.create_message(
                MessageType.AUTH_REQUEST,
                auth_data
            )
            
            # Increase timeout for authentication
            auth_timeout = 10.0  # 10 seconds timeout for authentication
            logger.debug(f"Waiting for authentication response (timeout: {auth_timeout}s)...")
            
            # Create a future for the response
            response_future = asyncio.Future()
            self.pending_requests[request_id] = response_future
            
            try:
                # Send the auth request
                await self.send_message(auth_request)
                logger.debug(f"Authentication request sent (request_id: {request_id})")
                
                # Wait for the response with timeout
                response = await asyncio.wait_for(
                    response_future,
                    timeout=auth_timeout
                )
                
                if not response:
                    logger.error("No response object received from server")
                    raise Exception("No response received from server")
                
                logger.debug("Received response type: %s", response.message_type)
                
                # Process the response
                if response.message_type != MessageType.AUTH_RESPONSE:
                    logger.error("Unexpected message type: %s", response.message_type)
                    raise Exception(f"Unexpected message type: {response.message_type}")
                
                # Handle the authentication response
                if not response.payload.get('success'):
                    error_msg = response.payload.get('error', 'Authentication failed')
                    logger.error("Authentication failed: %s", error_msg)
                    self._notify_auth_handlers(False, error_msg)
                    return
                
                # Authentication successful
                logger.info("Authentication successful")
                self.authenticated = True
                self._notify_auth_handlers(True, response.payload.get('auth_data', {}))
                
            except asyncio.TimeoutError:
                logger.error("Authentication timed out waiting for response")
                self._notify_auth_handlers(False, "Authentication timed out")
                raise Exception("Authentication timed out")
                
            except Exception as e:
                logger.error("Error during authentication: %s", str(e), exc_info=True)
                self._notify_auth_handlers(False, str(e))
                raise
                
            finally:
                # Clean up the future
                self.pending_requests.pop(request_id, None)
            
            # Check if this is an error message
            if response.message_type == MessageType.ERROR:
                error_msg = response.payload.get('error', 'Unknown error')
                raise Exception(f"Authentication error: {error_msg}")
                
            if response.message_type != MessageType.AUTH_RESPONSE:
                raise Exception(f"Unexpected response type: {response.message_type}")
            
            # Check if authentication was successful
            if not response.payload.get('success'):
                error_msg = response.payload.get('error', 'Authentication failed')
                logger.error("Authentication failed: %s", error_msg)
                self._notify_auth_handlers(False)
                return
                
            # Authentication successful
            self.authenticated = True
            self.auth_data = response.payload.get('auth_data', {})
            logger.info("Successfully authenticated with server")
            logger.debug("Authentication data: %s", self.auth_data)
            
            # Notify auth handlers
            self._notify_auth_handlers(True)
            
        except asyncio.TimeoutError as e:
            logger.error("Authentication timed out: %s", e)
            self._notify_auth_handlers(False)
            raise
        except Exception as e:
            logger.error("Authentication error: %s", str(e), exc_info=True)
            self._notify_auth_handlers(False)
            raise
    
    async def _handle_auth_response(self, message: Message) -> None:
        """Handle authentication response from server."""
        # This is handled in the _authenticate method via pending_requests
        pass
    
    async def _handle_error(self, message: Message) -> None:
        """Handle error messages from the server."""
        error_data = message.payload or {}
        error_msg = error_data.get('error', 'Unknown error')
        request_id = error_data.get('request_id')

        logger.error(f"Received error from server: '{error_msg}' (request_id: {request_id})")

        # If the error corresponds to a pending request, raise an exception for the caller
        if request_id and request_id in self.pending_requests:
            future = self.pending_requests.pop(request_id)
            if not future.done():
                future.set_exception(ConnectionAbortedError(f"Server error: {error_msg}"))
        else:
            # Handle unsolicited errors (e.g., global notifications, forced disconnect)
            logger.warning(f"Received an unsolicited error from server: {error_msg}")
            if error_data.get('code') == 'auth_required':
                # This might indicate our session expired
                self.authenticated = False
                self._notify_auth_handlers(False)
    
    def _notify_connection_handlers(self, connected: bool) -> None:
        """Notify all connection state change handlers."""
        for handler in self.connection_handlers:
            try:
                handler(connected)
            except Exception as e:
                logger.error(f"Error in connection handler: {e}")
    
    def _notify_auth_handlers(self, authenticated: bool, auth_data: Optional[Dict[str, Any]] = None) -> None:
        """Notify all authentication state change handlers.
        
        Args:
            authenticated: Whether authentication was successful
            auth_data: Optional authentication data to pass to handlers
        """
        for handler in self.auth_handlers:
            try:
                handler(authenticated, auth_data or {})
            except Exception as e:
                logger.error(f"Error in auth handler: {e}")
    
    async def _handle_connection_error(self) -> None:
        """Handle connection errors and schedule reconnection if enabled."""
        if not self.auto_reconnect:
            return
            
        # Reset connection state
        await self._reset_connection()
        
        # Schedule reconnection with exponential backoff
        self.reconnect_task = asyncio.create_task(self._reconnect())
    
    def _handle_task_done(self, task: asyncio.Task) -> None:
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
    
    async def _reconnect(self) -> None:
        """Attempt to reconnect to the server with exponential backoff."""
        if not self.auto_reconnect or self.connected:
            return
            
        while not self.connected:
            try:
                logger.info(f"Attempting to reconnect in {self.reconnect_delay} seconds...")
                await asyncio.sleep(self.reconnect_delay)
                
                # Double the delay for next time (with max of 5 minutes)
                self.reconnect_delay = min(self.reconnect_delay * 2, 300)
                
                # Try to reconnect
                if await self.connect(self.config.sync_host, self.config.sync_port):
                    logger.info("Successfully reconnected to server")
                    self.reconnect_delay = 5  # Reset delay on successful connection
                    return
                    
            except asyncio.CancelledError:
                logger.info("Reconnection cancelled")
                return
            except Exception as e:
                logger.error(f"Reconnection attempt failed: {e}")
    
    async def _reset_connection(self) -> None:
        """Reset connection state."""
        was_connected = self.connected
        was_authenticated = self.authenticated
        
        # Close existing connection
        if self.writer and not self.writer.is_closing():
            self.writer.close()
            try:
                await self.writer.wait_closed()
            except Exception as e:
                logger.debug(f"Error closing writer: {e}")
        
        # Reset state
        self.reader = None
        self.writer = None
        self.connected = False
        self.authenticated = False
        
        # Cancel any pending tasks
        await self._cancel_tasks()
        
        # Cancel pending requests
        for future in self.pending_requests.values():
            if not future.done():
                future.set_exception(ConnectionError("Connection lost"))
        self.pending_requests.clear()
        
        # Notify handlers if state changed
        if was_connected:
            self._notify_connection_handlers(False)
        if was_authenticated:
            self._notify_auth_handlers(False)
    
    async def send_message(self, message: Message, wait_for_response: bool = False) -> Optional[Message]:
        """Send a message to the server with security features.
        
        Args:
            message: The message to send
            wait_for_response: If True, wait for a response to this message
                
        Returns:
            Optional[Message]: The response message if wait_for_response is True, None otherwise
                
        Raises:
            ConnectionError: If not connected to the server
            ValueError: If message validation fails
        """
        if not self.connected or not self.writer:
            raise ConnectionError("Not connected to server")
        
        request_id = None
        future = None
        
        try:
            # Add request ID if we're waiting for a response
            if wait_for_response:
                request_id = str(uuid.uuid4())
                if not message.payload:
                    message.payload = {}
                message.payload['request_id'] = request_id
                future = asyncio.Future()
                self.pending_requests[request_id] = future
            
            # Sign the message if we have a secret key
            if self.handler.secret_key and not message.signature:
                message.sign(self.handler.secret_key)
                
            # Validate the message before sending
            is_valid, reason = self.handler.validate_message(message, check_signature=False)
            if not is_valid:
                raise ValueError(f"Invalid message: {reason}")
            
            # Send the message
            await self._send_raw(message.to_bytes())
            
            # If we're waiting for a response, wait for it
            if wait_for_response and future:
                try:
                    response = await asyncio.wait_for(future, timeout=10.0)
                    logger.debug(f"Received response for message {request_id}")
                    return response
                except asyncio.TimeoutError:
                    logger.warning(f"Timeout waiting for response to message {request_id}")
                    raise
                finally:
                    # Clean up the pending request
                    if request_id in self.pending_requests:
                        self.pending_requests.pop(request_id)
            
            return None
            
        except (ConnectionResetError, BrokenPipeError) as e:
            logger.error("Connection lost while sending message")
            await self._handle_connection_error()
            raise ConnectionError("Connection lost") from e
        except asyncio.CancelledError:
            logger.debug("Message sending cancelled")
            raise
        except Exception as e:
            logger.error(f"Error sending message: {e}", exc_info=True)
            # Clean up the pending request if there was an error
            if request_id and request_id in self.pending_requests:
                self.pending_requests.pop(request_id)
            raise
    
    async def _send_raw(self, data: bytes) -> None:
        """Send raw data to the server.
        
        Args:
            data: The raw bytes to send
            
        Raises:
            ConnectionError: If there's an error sending the data
        """
        if not self.writer:
            raise ConnectionError("Not connected to server")
            
        try:
            # Send message length (4 bytes) followed by the message
            header = struct.pack('>I', len(data))
            self.writer.write(header + data)
            await self.writer.drain()
            logger.debug(f"Sent {len(data)} bytes to server")
            
        except (ConnectionResetError, BrokenPipeError) as e:
            logger.error("Connection lost while sending data")
            await self._handle_connection_error()
            raise ConnectionError("Connection lost while sending data") from e
        except Exception as e:
            logger.error(f"Error sending data: {e}")
            raise
    
            logger.error(f"Error sending message: {e}", exc_info=True)
            raise

    async def _send_heartbeats(self) -> None:
        """Send periodic heartbeat messages to the server."""
        while self.connected:
            try:
                heartbeat = self.handler.create_message(MessageType.HEARTBEAT)
                await self.send_message(heartbeat)
                await asyncio.sleep(30)  # Send heartbeat every 30 seconds
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error sending heartbeat: {e}")
                await asyncio.sleep(5)  # Wait before retrying
    
    # Message handlers
    async def _handle_sync_request(self, message: Message) -> None:
        """Handle a sync request from the server."""
        logger.info("Received sync request from server")
        # TODO: Implement sync logic
        
        # For now, just send an acknowledgment
        ack = self.handler.create_message(
            MessageType.SYNC_ACK,
            {"status": "received", "request_id": message.payload.get("request_id")}
        )
        await self.send_message(ack)
    
    async def _handle_sync_data(self, message: Message) -> None:
        """Handle sync data from the server."""
        logger.info("Received sync data from server")
        # TODO: Process sync data
        
        # Acknowledge the data
        ack = self.handler.create_message(
            MessageType.SYNC_ACK,
            {"status": "processed", "data_id": message.payload.get("data_id")}
        )
        await self.send_message(ack)
    
    async def _handle_sync_ack(self, message: Message) -> None:
        """Handle an acknowledgment from the server."""
        logger.debug(f"Received ACK from server: {message.payload}")
        # TODO: Update sync state based on the acknowledgment
    
    async def _handle_ack(self, message: Message) -> None:
        """Handle acknowledgment message from server.
        
        Args:
            message: The ACK message
        """
        if not message.payload:
            logger.debug("Received empty ACK")
            return
            
        ack_id = message.payload.get('ack_id')
        if not ack_id:
            logger.debug("Received ACK without ack_id")
            return
            
        logger.debug(f"Received ACK for message {ack_id}")
        
        # Notify any waiting operations
        if ack_id in self.pending_requests:
            future = self.pending_requests.pop(ack_id)
            if not future.done():
                future.set_result(message.payload)
    
    async def _handle_sync_response(self, message: Message) -> None:
        """Handle sync response from server.
        
        Args:
            message: The sync response message
        """
        if not message.payload:
            logger.warning("Received empty sync response")
            return
            
        logger.info(f"Received sync response: {message.payload}")
        
        # Extract sync metadata from the response
        sync_id = message.payload.get('sync_id')
        status = message.payload.get('status')
        
        if not sync_id:
            logger.warning("Sync response missing sync_id")
            return
            
        # Notify any waiting sync operations
        if sync_id in self.pending_requests:
            future = self.pending_requests.pop(sync_id)
            if not future.done():
                if status == 'success':
                    future.set_result(message.payload)
                else:
                    error_msg = message.payload.get('error', 'Sync failed')
                    future.set_exception(Exception(f"Sync failed: {error_msg}"))
    
    async def _handle_heartbeat(self, message: Message) -> None:
        """Handle heartbeat message from server."""
        logger.debug("Received heartbeat from server")
        # Send ack back to server
        ack = self.handler.create_message(MessageType.HEARTBEAT, {})
        await self.send_message(ack)

    async def __aenter__(self):
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.disconnect()
