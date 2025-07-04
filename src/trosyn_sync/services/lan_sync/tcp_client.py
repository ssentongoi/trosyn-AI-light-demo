"""
TCP Client for LAN Sync

This module implements a TCP client for handling sync operations between nodes.
"""
import asyncio
import json
import logging
import struct
import ssl
import time
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
        self._connected_event = asyncio.Event()
    
    async def connect(self, host: str, port: int) -> bool:
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
            # Cancel any existing reconnect task
            if self.reconnect_task and not self.reconnect_task.done():
                self.reconnect_task.cancel()
                try:
                    await self.reconnect_task
                except asyncio.CancelledError:
                    pass
                self.reconnect_task = None
            
            # Reset connection state
            await self._reset_connection()
            
            # Set up SSL context if needed
            ssl_context = None
            if self.config.use_ssl:
                ssl_context = self.ssl_context
                
            # Log connection attempt
            protocol = "SSL/TLS" if self.config.use_ssl else "plaintext"
            logger.info(f"Attempting to connect to {host}:{port} with {protocol}...")

            # Enable SSL debug logging
            if self.ssl_context:
                logger.debug("SSL context settings:")
                logger.debug(f"  Protocol: {self.ssl_context.protocol}")
                logger.debug(f"  Verify mode: {self.ssl_context.verify_mode}")
                logger.debug(f"  Check hostname: {self.ssl_context.check_hostname}")
            
            # Create connection with timeout
            try:
                # Only include ssl_handshake_timeout if using SSL
                connect_kwargs = {
                    'host': host,
                    'port': port,
                    'ssl': ssl_context
                }
                if ssl_context:
                    connect_kwargs['ssl_handshake_timeout'] = 10.0
                
                connect_coro = asyncio.open_connection(**connect_kwargs)
                
                # Use asyncio.wait_for to add a timeout to the entire connection process
                self.reader, self.writer = await asyncio.wait_for(connect_coro, timeout=15.0)
                
                # Connection successful
                self.connected = True
                self.authenticated = False  # Reset authenticated state
                
                # Start background tasks
                self.receive_task = asyncio.create_task(self._receive_messages())
                self.receive_task.add_done_callback(self._handle_task_done)
                
                if self.auto_reconnect:
                    self.heartbeat_task = asyncio.create_task(self._send_heartbeats())
                    self.heartbeat_task.add_done_callback(self._handle_task_done)
                
                logger.info(f"Connected to {host}:{port}")
                
                # Notify connection handlers
                self._notify_connection_handlers(True)
                
                # Start authentication if required
                if self.require_auth:
                    if not self.auth_callback:
                        logger.error("Authentication required but no auth_callback provided")
                        await self.disconnect()
                        return False
                return True

            except Exception as e:
                # Handle connection errors
                logger.error(f"Unexpected error during connection: {str(e)}", exc_info=True)
                if hasattr(e, 'winerror') and e.winerror:
                    logger.error(f"Windows error code: {e.winerror}")
                raise
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
                        logger.error(f"Error getting SSL/TLS details: {e}")
                        if hasattr(e, 'winerror') and e.winerror:
                            logger.error(f"Windows error code: {e.winerror}")
            
            # Mark as connected and set the event immediately
            self.connected = True
            logger.info(f"Connected to {host}:{port}")
            
            # Start receive task first
            self.receive_task = asyncio.create_task(self._receive_messages())
            self.receive_task.add_done_callback(self._handle_task_done)
            self._tasks.append(self.receive_task)
            
            # Start heartbeat if configured (but don't wait for it)
            heartbeat_interval = getattr(self.config, 'heartbeat_interval', 30)
            if heartbeat_interval > 0:
                self.heartbeat_task = asyncio.create_task(self._send_heartbeats())
                self.heartbeat_task.add_done_callback(self._handle_task_done)
                self._tasks.append(self.heartbeat_task)
                logger.debug(f"Started heartbeat task with interval: {heartbeat_interval}s")
            
            # Only set _connected_event if we don't require authentication
            # Otherwise, it will be set after successful authentication
            if not self.require_auth:
                self._connected_event.set()
                logger.info(f"Connection to {host}:{port} is ready for use")
            
            # Authenticate if required
            if self.auth_callback and not self.authenticated:
                auth_success = await self._authenticate()
                if not auth_success and self.require_auth:
                    logger.error("Authentication failed and authentication is required")
                    await self.disconnect()
                    return False
            
            # Verify connection is stable by waiting for the first heartbeat
            connect_timeout = getattr(self.config, 'connect_timeout', 10.0)
            try:
                # Create a new event to wait for the first heartbeat
                first_heartbeat = asyncio.Event()
                
                # Store the original heartbeat handler
                original_heartbeat_handler = self.message_handlers.get(MessageType.HEARTBEAT)
                
                # Create a wrapper that will set the event on first heartbeat
                async def heartbeat_wrapper(message):
                    if original_heartbeat_handler:
                        await original_heartbeat_handler(message)
                    first_heartbeat.set()
                
                # Replace the handler temporarily
                self.message_handlers[MessageType.HEARTBEAT] = heartbeat_wrapper
                
                # Wait for either the first heartbeat or timeout
                logger.debug("Waiting for first heartbeat to confirm connection stability...")
                await asyncio.wait_for(
                    first_heartbeat.wait(),
                    timeout=connect_timeout
                )
                
                # Restore the original handler
                if original_heartbeat_handler:
                    self.message_handlers[MessageType.HEARTBEAT] = original_heartbeat_handler
                    
                logger.debug("First heartbeat received, connection is stable")
                
            except asyncio.TimeoutError:
                logger.warning(f"Connection to {host}:{port} did not receive initial heartbeat after {connect_timeout} seconds")
                # Don't fail the connection just because of missing heartbeat
                # The heartbeat check is just a warning for monitoring purposes
            
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
        self._connected_event.set()  # Signal that connection is established
    
    async def _process_message(self, data: bytes) -> None:
        """Process an incoming message from the server.
        
        This method handles message parsing, validation, and routing to appropriate handlers.
        It includes special handling for authentication and error messages.
        """
        try:
            # Parse the message first to get basic information
            try:
                message = Message.from_bytes(data)
                logger.debug(f"Received {message.message_type.name} from server (ID: {message.message_id})")
            except (json.JSONDecodeError, struct.error, ValueError) as e:
                logger.error(f"Failed to decode message: {e}")
                # Try to send an error response if possible
                if self.connected and self.writer and not self.writer.is_closing():
                    error_msg = self.handler.create_error_message(
                        code="invalid_message",
                        message="Failed to decode message",
                        details=str(e)
                    )
                    try:
                        await self._send_raw(error_msg.to_bytes())
                    except Exception as send_error:
                        logger.debug(f"Failed to send error response: {send_error}")
                return

            # Update last seen timestamp for connection keepalive
            self.last_message_time = time.time()
            
            # Handle error messages first
            if message.message_type == MessageType.ERROR:
                await self._handle_error_message(message)
                return
                
            # Handle authentication responses specially
            if message.message_type == MessageType.AUTH_RESPONSE:
                await self._handle_auth_response(message)
                return
                
            # For other messages, check if authentication is required
            if self.require_auth and not self.authenticated:
                logger.warning(f"Received {message.message_type.name} before authentication. Discarding.")
                # Optionally send an auth_required error back
                if message.message_type not in [MessageType.HEARTBEAT]:  # Don't respond to heartbeats
                    error_msg = self.handler.create_error_message(
                        code="auth_required",
                        message="Authentication required",
                        request_id=getattr(message, 'message_id', None)
                    )
                    try:
                        await self._send_raw(error_msg.to_bytes())
                    except Exception as e:
                        logger.debug(f"Failed to send auth_required error: {e}")
                return
                
            # Validate the message signature if required
            if self.require_auth and message.message_type not in [MessageType.HEARTBEAT]:
                is_valid, reason = self.handler.validate_message(message, check_signature=True)
                if not is_valid:
                    logger.warning(f"Invalid message signature: {reason}. Discarding.")
                    return

            # Check if this is a response to a pending request
            request_id = None
            if isinstance(message.payload, dict):
                request_id = message.payload.get('request_id')
                if request_id and request_id in self.pending_requests:
                    future = self.pending_requests.pop(request_id)
                    if not future.done():
                        future.set_result(message)
                        logger.debug(f"Resolved pending request: {request_id}")
                        return  # The response has been handled

            # Route to the appropriate message handler
            handler = self.message_handlers.get(message.message_type)
            if handler:
                try:
                    await handler(message)
                except Exception as e:
                    logger.error(f"Error in {message.message_type.name} handler: {e}", exc_info=True)
                    # Send error response if possible
                    if request_id and self.connected and self.writer and not self.writer.is_closing():
                        error_msg = self.handler.create_error_message(
                            code="handler_error",
                            message="Error processing message",
                            request_id=request_id,
                            details=str(e)
                        )
                        try:
                            await self._send_raw(error_msg.to_bytes())
                        except Exception as send_error:
                            logger.debug(f"Failed to send error response: {send_error}")
            else:
                logger.warning(f"No handler for message type: {message.message_type.name}")
                
        except asyncio.CancelledError:
            raise  # Let the caller handle cancellation
        except Exception as e:
            logger.error(f"Unexpected error in _process_message: {e}", exc_info=True)
            
    async def _handle_error_message(self, message: Message) -> None:
        """Handle error messages from the server."""
        if not isinstance(message.payload, dict):
            logger.error("Received malformed error message")
            return
            
        error_code = message.payload.get('code', 'unknown_error')
        error_msg = message.payload.get('message', 'Unknown error')
        request_id = message.payload.get('request_id')
        
        logger.error(f"Server error: {error_msg} (code: {error_code}, request_id: {request_id})")
        
        # Handle specific error codes
        if error_code == 'auth_required':
            self.authenticated = False
            self._notify_auth_handlers(False, {
                'code': error_code,
                'message': error_msg,
                'reconnecting': self.auto_reconnect
            })
            
            # If we were previously authenticated, try to re-authenticate
            if self.auth_callback and self.auto_reconnect:
                logger.info("Authentication required, attempting to re-authenticate...")
                try:
                    await self._authenticate()
                except Exception as e:
                    logger.error(f"Re-authentication failed: {e}")
        
        # Handle the error for the specific request if possible
        if request_id and request_id in self.pending_requests:
            future = self.pending_requests.pop(request_id)
            if not future.done():
                future.set_exception(ConnectionError(f"Server error: {error_msg} (code: {error_code})"))
    
    async def _authenticate(self) -> bool:
        """Handle authentication with the server.
        
        This method handles the authentication flow with the server, including:
        1. Getting credentials from the auth callback
        2. Sending auth request
        3. Waiting for and validating the response
        4. Updating connection state
        
        Returns:
            bool: True if authentication was successful, False otherwise
        """
        if not self.connected:
            logger.warning("Cannot authenticate: not connected to server")
            return False
            
        if self.authenticated:
            logger.debug("Already authenticated")
            return True
            
        if not callable(self.auth_callback):
            logger.error("Auth callback is not callable")
            self._notify_auth_handlers(False, "Invalid auth configuration")
            return False
            
        request_id = str(uuid.uuid4())
        logger.debug(f"Starting authentication (request_id: {request_id})")
        
        try:
            # Get authentication data from the callback
            try:
                auth_data = await self.auth_callback()
                if not auth_data:
                    logger.warning("No authentication data provided")
                    self._notify_auth_handlers(False, "No credentials provided")
                    return False
            except Exception as e:
                logger.error(f"Error in auth callback: {e}")
                self._notify_auth_handlers(False, f"Auth callback failed: {e}")
                return False

            # Prepare auth request
            if not isinstance(auth_data, dict):
                auth_data = {'token': str(auth_data)}
                
            # Add metadata to the auth request
            auth_data.update({
                'request_id': request_id,
                'timestamp': int(time.time()),
                'client_version': '1.0.0'  # Could be made configurable
            })
            
            # Create and validate the auth message
            try:
                auth_request = self.handler.create_message(
                    MessageType.AUTH_REQUEST,
                    auth_data
                )
                
                # Validate the message before sending
                is_valid, reason = self.handler.validate_message(auth_request, check_signature=False)
                if not is_valid:
                    logger.error(f"Invalid auth request: {reason}")
                    self._notify_auth_handlers(False, f"Invalid auth request: {reason}")
                    return False
                    
            except Exception as e:
                logger.error(f"Error creating auth request: {e}")
                self._notify_auth_handlers(False, f"Error creating auth request: {e}")
                return False
            
            # Register for the response before sending to avoid race conditions
            response_future = asyncio.Future()
            self.pending_requests[request_id] = response_future
            
            # Send the auth request with retry logic
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    await self.send_message(auth_request)
                    logger.debug(f"Authentication request sent (request_id: {request_id}, attempt {attempt + 1}/{max_retries})")
                    break
                except (ConnectionError, asyncio.TimeoutError) as e:
                    if attempt == max_retries - 1:
                        logger.error(f"Failed to send auth request after {max_retries} attempts")
                        raise
                    logger.warning(f"Auth request failed (attempt {attempt + 1}/{max_retries}): {e}")
                    await asyncio.sleep(1)  # Short delay before retry
            
            # Wait for response with timeout
            try:
                response = await asyncio.wait_for(
                    response_future,
                    timeout=15.0  # Increased timeout for auth
                )
            except asyncio.TimeoutError:
                logger.error("Authentication timed out waiting for response")
                self._notify_auth_handlers(False, "Authentication timed out")
                return False
                
            # Validate response
            if not response or response.message_type != MessageType.AUTH_RESPONSE:
                error_msg = f"Invalid response type: {getattr(response, 'message_type', 'None')}"
                logger.error(error_msg)
                self._notify_auth_handlers(False, error_msg)
                return False
                
            # Check if authentication was successful
            if not response.payload.get('success'):
                error_msg = response.payload.get('error', 'Authentication failed')
                logger.error(f"Authentication failed: {error_msg}")
                self._notify_auth_handlers(False, error_msg)
                return False
                
            # Update authentication state
            self.authenticated = True
            self.auth_data = response.payload.get('auth_data', {})
            logger.info("Successfully authenticated with server")
            
            # Set the connected event now that we're fully authenticated
            # This ensures no messages are sent until authentication is complete
            self._connected_event.set()
            logger.info("Connection is now fully established and ready for use")
            
            # Notify handlers of successful authentication
            self._notify_auth_handlers(True, self.auth_data)
            return True
            
        except asyncio.CancelledError:
            logger.debug("Authentication was cancelled")
            self._notify_auth_handlers(False, "Authentication cancelled")
            raise
            
        except Exception as e:
            logger.error(f"Authentication error: {e}", exc_info=True)
            self.authenticated = False
            self.auth_data = None
            self._notify_auth_handlers(False, str(e))
            return False
            
        finally:
            # Always clean up the future
            if request_id in self.pending_requests:
                self.pending_requests.pop(request_id, None)

    async def _handle_auth_response(self, message: Message) -> None:
        """Handle authentication response from server."""
        future = None
        try:
            if not isinstance(message.payload, dict):
                logger.error("Invalid auth response: payload is not a dictionary")
                return
                
            # Check if this is a response to a pending authentication request
            request_id = message.payload.get('request_id')
            if not request_id:
                logger.warning("Received auth response without request_id")
                return
                
            # Find the pending request
            future = self.pending_requests.pop(request_id, None)
            if not future:
                logger.warning(f"Received auth response for unknown request_id: {request_id}")
                return
                
            if future.done():
                logger.warning(f"Received duplicate auth response for request_id: {request_id}")
                return
                
            # Check if authentication was successful
            if message.payload.get('success'):
                logger.info("Authentication successful")
                self.authenticated = True
                self.auth_data = message.payload.get('auth_data', {})
                
                # Set the connected event now that we're fully authenticated
                self._connected_event.set()
                logger.info("Connection is now fully established and ready for use")
                
                future.set_result(message)
                self._notify_auth_handlers(True, self.auth_data)
            else:
                error_msg = message.payload.get('error', 'Authentication failed')
                logger.error(f"Authentication failed: {error_msg}")
                future.set_exception(ConnectionRefusedError(error_msg))
                self._notify_auth_handlers(False, {'error': error_msg})
                
        except Exception as e:
            logger.error(f"Error processing auth response: {e}", exc_info=True)
            # If we have a future, make sure it's completed with an exception
            if future is not None and not future.done():
                future.set_exception(e)
                self._notify_auth_handlers(False, {'error': str(e)})
    
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
            
        max_reconnect_attempts = getattr(self.config, 'max_reconnect_attempts', 10)
        attempt = 0
        
        while not self.connected and attempt < max_reconnect_attempts:
            attempt += 1
            try:
                logger.info(f"Attempting to reconnect (attempt {attempt}/{max_reconnect_attempts}) in {self.reconnect_delay} seconds...")
                await asyncio.sleep(self.reconnect_delay)
                
                # Double the delay for next time (with max of 5 minutes)
                self.reconnect_delay = min(self.reconnect_delay * 2, 300)
                
                # Reset connection state before reconnecting
                await self._reset_connection()
                
                # Try to reconnect
                if await self.connect(self.config.sync_host, self.config.sync_port):
                    # If authentication is required, re-authenticate
                    if self.require_auth and self.auth_callback:
                        logger.info("Re-authenticating after reconnection...")
                        auth_success = await self._authenticate()
                        if not auth_success:
                            logger.error("Re-authentication failed")
                            continue  # Will retry with backoff
                    
                    logger.info("Successfully reconnected and re-authenticated with server")
                    self.reconnect_delay = 5  # Reset delay on successful connection
                    self._notify_connection_handlers(True)
                    return
                    
            except asyncio.CancelledError:
                logger.info("Reconnection cancelled")
                return
            except Exception as e:
                logger.error(f"Reconnection attempt {attempt} failed: {e}")
                if attempt >= max_reconnect_attempts:
                    logger.error(f"Max reconnection attempts ({max_reconnect_attempts}) reached. Giving up.")
                    self._notify_connection_handlers(False)
                    break
    
    async def _reset_connection(self) -> None:
        """Reset connection state and clean up resources.
        
        This method ensures all resources are properly cleaned up and notifies
        any registered handlers of the disconnection.
        
        Note:
            This method is idempotent and can be called multiple times safely.
        """
        was_connected = self.connected
        was_authenticated = self.authenticated
        
        # Reset state first to prevent new operations
        self.connected = False
        self.authenticated = False
        
        # Clear the connected event to block new operations
        self._connected_event.clear()
        
        # Close existing connection if needed
        if self.writer is not None:
            writer = self.writer
            self.writer = None
            
            if not writer.is_closing():
                try:
                    # Try to send a graceful close if possible
                    if writer.can_write_eof():
                        writer.write_eof()
                        await asyncio.wait_for(writer.drain(), timeout=1.0)
                    
                    # Close the writer
                    writer.close()
                    try:
                        await asyncio.wait_for(writer.wait_closed(), timeout=2.0)
                    except asyncio.TimeoutError:
                        logger.warning("Timed out waiting for writer to close")
                        
                except (ConnectionResetError, BrokenPipeError):
                    # Connection was already closed/reset
                    pass
                except Exception as e:
                    logger.debug(f"Error during connection close: {e}", exc_info=True)
        
        # Clear reader reference
        self.reader = None
        
        # Cancel any pending tasks
        await self._cancel_tasks()
        
        # Cancel pending requests with proper error
        if self.pending_requests:
            logger.debug(f"Cancelling {len(self.pending_requests)} pending requests")
            for request_id, future in list(self.pending_requests.items()):
                if not future.done():
                    future.set_exception(ConnectionError("Connection reset"))
                del self.pending_requests[request_id]
        
        # Notify handlers if state changed
        try:
            if was_connected:
                self._notify_connection_handlers(False)
                
            if was_authenticated:
                # Only notify auth handlers if we were previously authenticated
                self._notify_auth_handlers(False, {
                    'connected': False,
                    'authenticated': False,
                    'message': 'Connection reset'
                })
        except Exception as e:
            logger.error(f"Error notifying state change handlers: {e}", exc_info=True)
        
        logger.info("Connection reset complete")
    
    async def send_message(self, message: Message, wait_for_response: bool = False) -> Optional[Message]:
        """Send a message to the server with security features.
        
        Args:
            message: The message to send
            wait_for_response: If True, wait for a response to this message
                
        Returns:
            Optional[Message]: The response message if wait_for_response is True, None otherwise
                
        Raises:
            ConnectionError: If not connected to the server or connection is not ready
            ValueError: If message validation fails
            asyncio.TimeoutError: If waiting for connection times out
        """
        # Skip readiness check for AUTH_REQUEST messages since authentication is what makes the connection ready
        if hasattr(message, 'message_type') and message.message_type == MessageType.AUTH_REQUEST:
            logger.debug("Bypassing connection readiness check for authentication message")
            # Continue without waiting for connected_event
        else:
            # Wait for connection to be fully established for non-auth messages
            try:
                await asyncio.wait_for(
                    self._connected_event.wait(),
                    timeout=10.0  # Reasonable timeout for connection to be ready
                )
            except asyncio.TimeoutError:
                logger.error("Timed out waiting for connection to be ready after 10s")
                raise ConnectionError("Timed out waiting for connection to be ready")
            
        if not self.connected or not self.writer or self.writer.is_closing():
            raise ConnectionError("Not connected to server")
        
        request_id = None
        future = None
        
        try:
            # Create a copy of the message to avoid modifying the original
            message_to_send = message.copy() if hasattr(message, 'copy') else Message(**message.to_dict())

            # Add request ID if we're waiting for a response - must be done BEFORE signing
            if wait_for_response:
                request_id = str(uuid.uuid4())
                if not message_to_send.payload:
                    message_to_send.payload = {}
                message_to_send.payload['request_id'] = request_id
                future = asyncio.Future()
                self.pending_requests[request_id] = future
                logger.debug(f"[CLIENT] Added request_id to message payload: {request_id}")

            # Only sign the message if it hasn't been signed yet and we have a secret key
            if not message_to_send.signature and self.handler.secret_key:
                logger.debug(f"[CLIENT] Signing message {message_to_send.message_id} before sending")
                logger.debug(f"[CLIENT] Message before signing: {message_to_send.__dict__}")
                
                # Log the payload before signing
                if message_to_send.payload:
                    logger.debug("[CLIENT] Payload before signing:")
                    for k, v in message_to_send.payload.items():
                        logger.debug(f"[CLIENT]   {k}: {v!r} (type: {type(v).__name__})")
                
                # Sign the message
                message_to_send.sign(self.handler.secret_key)
                logger.debug(f"[CLIENT] Message after signing: {message_to_send.__dict__}")
                
                # Verify the signature immediately to catch any issues
                try:
                    is_valid = message_to_send.verify_signature(self.handler.secret_key)
                    if not is_valid:
                        logger.error("[CLIENT] Message failed signature verification immediately after signing!")
                        logger.error(f"[CLIENT] Message: {message_to_send.__dict__}")
                        logger.error(f"[CLIENT] Signing key: {self.handler.secret_key[:8].hex()}...")
                except Exception as e:
                    logger.error(f"[CLIENT] Error verifying signature after signing: {e}")
                    raise
            else:
                logger.debug(
                    f"[CLIENT] Message signing skipped - "
                    f"already_signed={bool(message_to_send.signature)}, "
                    f"has_secret_key={bool(self.handler.secret_key)}"
                )
            
            # Always validate the signature if the message is signed
            check_signature = bool(message_to_send.signature)
            logger.debug(
                f"[CLIENT] Will {'validate' if check_signature else 'skip validation of'} "
                f"signature for message {message_to_send.message_id}"
            )
            
            # Log message details before validation
            logger.debug(f"[CLIENT] Message type before validation: {type(message_to_send.message_type).__name__}")
            if hasattr(message_to_send.message_type, 'name'):
                logger.debug(f"[CLIENT] Message type name: {message_to_send.message_type.name}")
            
            # Validate the message before sending
            logger.debug(f"[CLIENT] Validating message {message_to_send.message_id} before sending")
            try:
                is_valid, reason = self.handler.validate_message(message_to_send, check_signature=check_signature)
                if not is_valid:
                    logger.error(f"[CLIENT] Message validation failed: {reason}")
                    logger.error(f"[CLIENT] Message details: {message_to_send.__dict__}")
                    raise ValueError(f"Invalid message: {reason}")
            except Exception as e:
                logger.error(f"[CLIENT] Error during message validation: {str(e)}")
                logger.error(f"[CLIENT] Message type: {type(message_to_send.message_type).__name__}")
                logger.error(f"[CLIENT] Message dict: {message_to_send.__dict__}")
                raise
            logger.debug(f"[CLIENT] Message {message.message_id} validation successful")
            
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
    
    async def _send_heartbeats(self) -> None:
        """Send periodic heartbeat messages to the server."""
        heartbeat_interval = getattr(self.config, 'heartbeat_interval', 30)  # Default to 30s if not set
        heartbeat_timeout = getattr(self.config, 'heartbeat_timeout', 10)  # Default to 10s if not set
        max_missed = getattr(self.config, 'max_missed_heartbeats', 3)  # Default to 3 if not set
        missed_heartbeats = 0
        
        while self.connected and not (self.writer and self.writer.is_closing()):
            try:
                # Send a heartbeat message
                message = Message(
                    message_type=MessageType.HEARTBEAT,
                    payload={"timestamp": int(time.time())}
                )
                
                # Send with timeout
                try:
                    await asyncio.wait_for(
                        self.send_message(message, wait_for_response=True),
                        timeout=heartbeat_timeout
                    )
                    missed_heartbeats = 0  # Reset counter on successful heartbeat
                    logger.debug("Heartbeat acknowledged")
                except asyncio.TimeoutError:
                    missed_heartbeats += 1
                    logger.warning(f"Heartbeat {missed_heartbeats}/{max_missed} missed")
                    if missed_heartbeats >= max_missed:
                        logger.error("Max missed heartbeats reached, disconnecting")
                        await self.disconnect()
                        break
                
                # Wait for the next heartbeat
                await asyncio.sleep(heartbeat_interval)
                
            except asyncio.CancelledError:
                logger.debug("Heartbeat task cancelled")
                break
            except Exception as e:
                logger.error(f"Error in heartbeat task: {e}")
                await self._handle_connection_error()
                break
    
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
        logger.debug("Received heartbeat from server. No action needed.")

    async def __aenter__(self):
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.disconnect()
