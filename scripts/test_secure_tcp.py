#!/usr/bin/env python3
"""
Secure TCP Sync Test Script

This script tests the secure TCP communication with SSL/TLS and authentication.
"""
import asyncio
import json
import logging
import os
import sys
from pathlib import Path
from typing import Dict, Any, Optional

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / 'src'))

from trosyn_sync.services.lan_sync.protocol import Message, MessageType, ProtocolHandler
from trosyn_sync.services.lan_sync.tcp_server import TCPSyncServer
from trosyn_sync.services.lan_sync.tcp_client import TCPSyncClient
from trosyn_sync.services.lan_sync.config import LANConfig
from trosyn_sync.services.lan_sync.security import SecurityManager

# Configure logging with debug level for SSL
logging.basicConfig(
    level=logging.DEBUG,  # Changed from INFO to DEBUG
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('secure_tcp_test.log')
    ]
)
logger = logging.getLogger(__name__)

# Enable debug logging for SSL
ssl_logger = logging.getLogger('ssl')
ssl_logger.setLevel(logging.DEBUG)

# Log SSL version info
import ssl
logger.debug(f"OpenSSL version: {ssl.OPENSSL_VERSION}")
logger.debug(f"SSL module version: {ssl.OPENSSL_VERSION_INFO}")

# Test configuration
TEST_PORT = 6001
TEST_USER = "testuser"
TEST_PASSWORD = "testpass123"

class SecureTestServer:
    """Secure test server implementation."""
    
    def __init__(self, port: int = TEST_PORT):
        """Initialize the secure test server."""
        self.port = port
        self.config = LANConfig()
        self.config.sync_port = port
        self.handler = ProtocolHandler(
            node_id=f"secure-server-{os.urandom(4).hex()}",
            node_name="Secure Test Server"
        )
        self.server = TCPSyncServer(
            self.config, 
            self.handler,
            auth_middleware=self.authenticate
        )
        self.running = False
        
    async def authenticate(self, message: Message) -> tuple[bool, Optional[Dict[str, Any]]]:
        """Simple authentication middleware for testing."""
        if message.message_type != MessageType.AUTH_REQUEST:
            return False, None
            
        auth_data = message.payload
        if not auth_data:
            logger.warning("No auth data provided")
            return False, None
            
        # Simple username/password check for testing
        if auth_data.get('username') == TEST_USER and auth_data.get('password') == TEST_PASSWORD:
            logger.info(f"User {TEST_USER} authenticated successfully")
            return True, {"user_id": "test123", "role": "admin"}
            
        logger.warning(f"Authentication failed for user: {auth_data.get('username')}")
        return False, None
    
    async def start(self) -> None:
        """Start the secure test server."""
        if self.running:
            return
            
        logger.info(f"Starting secure test server on port {self.port}")
        self.running = True
        
        try:
            await self.server.start()
        except Exception as e:
            logger.error(f"Server error: {e}")
            raise
    
    async def stop(self) -> None:
        """Stop the secure test server."""
        if not self.running:
            return
            
        logger.info("Stopping secure test server...")
        self.running = False
        await self.server.stop()

class SecureTestClient:
    """Secure test client implementation."""
    
    def __init__(self, host: str = '127.0.0.1', port: int = TEST_PORT):
        """Initialize the secure test client."""
        self.host = host
        self.port = port
        self.handler = ProtocolHandler(
            node_id=f"secure-client-{os.urandom(4).hex()}",
            node_name="Secure Test Client"
        )
        config = LANConfig()
        config.sync_host = host
        config.sync_port = port
        self.client = TCPSyncClient(
            config,
            self.handler,
            auth_callback=self.get_auth_credentials,
            auto_reconnect=True
        )
        self.authenticated = False
    
    async def get_auth_credentials(self) -> Dict[str, str]:
        """Return authentication credentials."""
        return {
            'username': TEST_USER,
            'password': TEST_PASSWORD
        }
    
    async def connect(self) -> bool:
        """Connect to the secure server."""
        logger.info(f"Connecting to secure server at {self.host}:{self.port}")
        
        # Register auth state change handler
        def on_auth_changed(authenticated: bool, auth_data: Dict[str, Any] = None) -> None:
            self.authenticated = authenticated
            auth_status = 'Authenticated' if authenticated else 'Not authenticated'
            logger.info(f"Authentication state changed: {auth_status}")
            if authenticated and auth_data:
                logger.debug(f"Authentication data: {auth_data}")
        
        self.client.auth_handlers.append(on_auth_changed)
        
        # Connect to server
        return await self.client.connect(self.host, self.port)
    
    async def disconnect(self) -> None:
        """Disconnect from the server."""
        await self.client.disconnect()
    
    async def send_test_message(self, message: str) -> None:
        """Send a test message to the server."""
        if not self.authenticated:
            logger.error("Not authenticated")
            return
            
        try:
            # Create a test message
            msg = self.handler.create_message(
                MessageType.SYNC_REQUEST,
                {
                    "request_id": os.urandom(8).hex(),
                    "message": message,
                    "timestamp": str(asyncio.get_event_loop().time())
                }
            )
            
            logger.info(f"Sending secure message: {message}")
            response = await self.client.send_message(msg, wait_for_response=True)
            
            if response:
                logger.info(f"Received secure response: {response.payload}")
            else:
                logger.warning("No response received")
                
        except Exception as e:
            logger.error(f"Error sending secure message: {e}")

async def run_test() -> None:
    """Run the secure TCP test."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Test Secure TCP Sync')
    parser.add_argument('--mode', choices=['server', 'client', 'both'], default='both',
                      help='Run as server, client, or both (default: both)')
    parser.add_argument('--host', default='127.0.0.1',
                      help='Server host (for client mode)')
    parser.add_argument('--port', type=int, default=TEST_PORT,
                      help='Server port (default: 6001)')
    args = parser.parse_args()
    
    server = None
    client = None
    tasks = []

    try:
        if args.mode in ['server', 'both']:
            server = SecureTestServer(port=args.port)
            asyncio.create_task(server.start())
            
        if args.mode in ['client', 'both']:
            # Run selected tests
            test_results = {}
            
            if args.test in ['all', 'basic']:
                test_results['basic'] = await test_basic_communication(args.host, args.port)
                
            if args.test in ['all', 'auth']:
                test_results['auth'] = await test_invalid_credentials(args.host, args.port)
                
            if args.test in ['all', 'reconnect']:
                test_results['reconnect'] = await test_reconnection(args.host, args.port)
            
            # Print summary
            logger.info("\n=== Test Summary ===")
            for test_name, result in test_results.items():
                status = "PASSED" if result else "FAILED"
                logger.info(f"{test_name.upper()}: {status}")
            
            if all(test_results.values()):
                logger.info("\n✅ All tests passed!")
                return 0
            else:
                logger.error("\n❌ Some tests failed")
                return 1
                
    except KeyboardInterrupt:
        logger.info("\nTest interrupted by user")
        return 1
    except Exception as e:
        logger.error(f"\nTest error: {e}")
        return 1
    finally:
        logger.info("\nCleaning up resources...")
        if client:
            await client.disconnect()
        if server and server.running:
            await server.stop()
        logger.info("Cleanup complete.")

if __name__ == "__main__":
    try:
        asyncio.run(run_test())
    except KeyboardInterrupt:
        logger.info("Test stopped by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)
