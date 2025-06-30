"""Test environment for LAN Sync integration tests."""
import asyncio
import logging
import os
import ssl
from typing import Optional, List, Dict, Any, AsyncIterator
from contextlib import asynccontextmanager

from trosyn_sync.services.lan_sync.tcp_server import TCPSyncServer
from trosyn_sync.services.lan_sync.tcp_client import TCPSyncClient
from trosyn_sync.services.lan_sync.protocol import ProtocolHandler
from trosyn_sync.services.lan_sync.discovery import DiscoveryService
from trosyn_sync.services.lan_sync.config import LANConfig

from .test_utils import TestLANConfigBuilder

logger = logging.getLogger(__name__)

class TCPSyncTestEnvironment:
    """Test environment for LAN Sync integration tests."""
    
    def __init__(
        self,
        node_id: Optional[str] = None,
        node_name: str = "test-node",
        port: int = 0,
        config: Optional[LANConfig] = None,
        enable_discovery: bool = True,
        node_type: str = "test",
        use_ssl: Optional[bool] = None,
        verify_ssl: Optional[bool] = None
    ):
        """Initialize the test environment.
        
        Args:
            node_id: Optional node ID. If None, a random one will be generated.
            node_name: Node display name.
            port: Base port number. Will use port for sync and port+1 for discovery.
            config: Optional pre-configured LANConfig. If None, a test config will be created.
            enable_discovery: Whether to enable the discovery service.
            node_type: Type of node (e.g., 'admin_hub', 'child_app', 'test').
            use_ssl: Whether to enable SSL for this node. If None, uses TROSYNC_USE_SSL env var.
            verify_ssl: Whether to verify SSL certificates. If None, uses TROSYNC_VERIFY_SSL env var.
        """
        self.node_id = node_id
        self.node_name = node_name
        self.port = port
        self.enable_discovery = enable_discovery
        self.node_type = node_type
        self.verify_ssl = verify_ssl if verify_ssl is not None else \
                        os.getenv('TROSYNC_VERIFY_SSL', '').lower() not in ('0', 'false', 'no', 'off')
        
        # Create or use provided config
        self.config = config or TestLANConfigBuilder.create_test_config(
            node_id=node_id,
            node_name=node_name,
            port=port,
            node_type=node_type,
            use_ssl=use_ssl
        )
        
        # Store SSL settings for server/client creation
        self._use_ssl = use_ssl if use_ssl is not None else self.config.use_ssl
        
        # Initialize components
        self.protocol_handler: Optional[ProtocolHandler] = None
        self.server: Optional[TCPSyncServer] = None
        self.discovery: Optional[DiscoveryService] = None
        self.clients: List[TCPSyncClient] = []
        
        # Track if we're running
        self._is_running = False
    
    async def __aenter__(self):
        """Enter the async context and start the test environment."""
        await self.start()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Exit the async context and clean up resources."""
        await self.stop()
    
    @property
    def is_running(self) -> bool:
        """Check if the test environment is running."""
        return self._is_running
    
    async def start(self):
        """Start the test environment."""
        if self._is_running:
            logger.warning("Test environment is already running")
            return
        
        logger.info(f"Starting test environment for node {self.node_id}")
        
        try:
            # Create protocol handler with SSL settings
            self.protocol_handler = ProtocolHandler(
                node_id=self.config.node_id,
                node_name=self.config.node_name,
                secret_key=os.urandom(32)  # Generate a random key for testing
            )
            
            # Configure SSL for the server if enabled
            if self._use_ssl:
                logger.info(f"Configuring SSL for test server (verify={self.verify_ssl})")
                # Configure SSL context
                self.config.ssl_verify_mode = ssl.CERT_NONE if not self.verify_ssl else ssl.CERT_REQUIRED
                self.config.ssl_check_hostname = self.verify_ssl
                
                # Create SSL context for the server
                self.config.ssl_context = self.config.create_ssl_context(server_side=True)
                
                # For tests, we'll use a self-signed cert
                if not self.config.ssl_context and self.verify_ssl:
                    logger.warning("Failed to create SSL context, falling back to unencrypted")
                    self.config.use_ssl = False
            
            # Start discovery service if enabled
            if self.enable_discovery:
                from trosyn_sync.services.lan_sync.discovery import NodeType
                
                # Convert node_type string to NodeType enum
                try:
                    node_type_enum = NodeType(self.node_type.lower())
                except ValueError:
                    logger.warning(f"Unknown node type '{self.node_type}'. Defaulting to 'test'.")
                    node_type_enum = NodeType.TEST
                
                self.discovery = DiscoveryService(
                    node_id=self.config.node_id,
                    node_name=self.config.node_name,
                    port=self.config.discovery_port,
                    discovery_interval=0.1,  # Faster for tests
                    node_type=node_type_enum
                )
                await self.discovery.start()
            
            # Start TCP server with SSL configuration
            self.server = TCPSyncServer(
                config=self.config,
                handler=self.protocol_handler,
                auth_middleware=self._auth_middleware if self.config.require_authentication else None,
                require_auth=self.config.require_authentication
            )
            
            # Start the server
            await self.server.start()
            # Update running state
            self._is_running = True
            logger.info(f"Test environment started for node {self.node_id}")
            
        except Exception as e:
            logger.error(f"Failed to start test environment: {e}")
            await self.stop()
            raise
    
    async def stop(self):
        """Stop the test environment and clean up resources."""
        if not self._is_running:
            return
            
        logger.info(f"Stopping test environment for node {self.node_id}")
        
        # Stop all clients
        for client in self.clients:
            try:
                if client.connected:
                    await client.disconnect()
            except Exception as e:
                logger.warning(f"Error disconnecting client: {e}")
        self.clients.clear()
        
        # Stop server if running
        if self.server:
            try:
                await self.server.stop()
            except Exception as e:
                logger.warning(f"Error stopping server: {e}")
            self.server = None
        
        # Stop discovery if enabled
        if self.discovery:
            try:
                await self.discovery.stop()
            except Exception as e:
                logger.warning(f"Error stopping discovery: {e}")
            self.discovery = None
        
        # Reset state
        self.protocol_handler = None
        self._is_running = False
        logger.info(f"Test environment stopped for node {self.node_id}")
    
    async def create_client(self, config: Optional[LANConfig] = None) -> TCPSyncClient:
        """Create and connect a TCP client to this server.
        
        Args:
            config: Optional client configuration. If None, a default config will be created.
            
        Returns:
            Connected TCPSyncClient instance.
        """
        if not self._is_running:
            raise RuntimeError("Test environment is not running")
            
        # Create client config with matching SSL settings if not provided
        client_config = config or TestLANConfigBuilder.create_client_config(
            self.config,
            use_ssl=self._use_ssl
        )
        
        # Configure SSL for the client if needed
        if self._use_ssl:
            client_config.ssl_verify_mode = ssl.CERT_NONE if not self.verify_ssl else ssl.CERT_REQUIRED
            client_config.ssl_check_hostname = self.verify_ssl
            client_config.ssl_context = client_config.create_ssl_context(server_side=False)
        
        # Create client
        client = TCPSyncClient(
            config=client_config,
            handler=self.protocol_handler
        )
        
        # Connect to server
        await client.connect("127.0.0.1", self.config.sync_port)
        self.clients.append(client)
        return client

@asynccontextmanager
async def create_test_environment(
    node_id: Optional[str] = None,
    node_name: str = "test-node",
    port: int = 0,
    config: Optional[LANConfig] = None,
    enable_discovery: bool = True,
    node_type: str = "test"
) -> AsyncIterator[TCPSyncTestEnvironment]:
    """Create and manage a test environment.
    
    Example:
        async with create_test_environment() as env:
            client = await env.create_client()
            # Test with client
            
    Args:
        node_id: Optional node ID. If None, a random one will be generated.
        node_name: Node display name.
        port: Base port number. Will use port for sync and port+1 for discovery.
        config: Optional pre-configured LANConfig. If None, a test config will be created.
        enable_discovery: Whether to enable the discovery service.
        node_type: Type of node (e.g., 'admin_hub', 'child_app', 'test').
    """
    env = TCPSyncTestEnvironment(
        node_id=node_id,
        node_name=node_name,
        port=port,
        config=config,
        enable_discovery=enable_discovery,
        node_type=node_type
    )
    
    try:
        await env.start()
        yield env
    finally:
        await env.stop()
