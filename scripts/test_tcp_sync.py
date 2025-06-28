#!/usr/bin/env python3
"""
TCP Sync Test Script

This script demonstrates the TCP sync functionality by starting a server and client
that communicate with each other.
"""
import asyncio
import json
import logging
import sys
import uuid
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / 'src'))

from trosyn_sync.services.lan_sync.protocol import Message, MessageType, ProtocolHandler
from trosyn_sync.services.lan_sync.tcp_server import TCPSyncServer
from trosyn_sync.services.lan_sync.tcp_client import TCPSyncClient
from trosyn_sync.services.lan_sync.config import LANConfig

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('tcp_sync_test.log')
    ]
)
logger = logging.getLogger(__name__)

class TestServer:
    """Test server implementation."""
    
    def __init__(self, port: int = 5001):
        """Initialize the test server."""
        self.port = port
        self.config = LANConfig(sync_port=port)
        self.handler = ProtocolHandler(
            node_id=f"server-{str(uuid.uuid4())[:8]}",
            node_name="Test Server"
        )
        self.server = TCPSyncServer(self.config, self.handler)
        self.running = False
    
    async def start(self) -> None:
        """Start the test server."""
        logger.info(f"Starting test server on port {self.port}")
        self.running = True
        
        # Start the server in the background
        self.server_task = asyncio.create_task(self.server.start())
        
        try:
            # Keep the server running
            while self.running:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            logger.info("Stopping test server...")
            await self.stop()
    
    async def stop(self) -> None:
        """Stop the test server."""
        self.running = False
        if hasattr(self, 'server_task'):
            self.server_task.cancel()
            try:
                await self.server_task
            except asyncio.CancelledError:
                pass
        await self.server.stop()

class TestClient:
    """Test client implementation."""
    
    def __init__(self, server_host: str = '127.0.0.1', server_port: int = 5001):
        """Initialize the test client."""
        self.server_host = server_host
        self.server_port = server_port
        self.handler = ProtocolHandler(
            node_id=f"client-{str(uuid.uuid4())[:8]}",
            node_name="Test Client"
        )
        self.client = TCPSyncClient(LANConfig(), self.handler)
        self.connected = False
    
    async def connect(self) -> bool:
        """Connect to the server."""
        logger.info(f"Connecting to server at {self.server_host}:{self.server_port}")
        self.connected = await self.client.connect(self.server_host, self.server_port)
        return self.connected
    
    async def disconnect(self) -> None:
        """Disconnect from the server."""
        if self.connected:
            await self.client.disconnect()
            self.connected = False
    
    async def send_test_message(self, message: str) -> None:
        """Send a test message to the server."""
        if not self.connected:
            logger.error("Not connected to server")
            return
        
        try:
            # Create a test message
            msg = self.handler.create_message(
                MessageType.SYNC_REQUEST,
                {
                    "request_id": str(uuid.uuid4()),
                    "message": message,
                    "timestamp": str(asyncio.get_event_loop().time())
                }
            )
            
            logger.info(f"Sending message: {message}")
            response = await self.client.send_message(msg, wait_for_response=True)
            
            if response:
                logger.info(f"Received response: {response.payload}")
            else:
                logger.warning("No response received")
                
        except Exception as e:
            logger.error(f"Error sending message: {e}")

async def run_test() -> None:
    """Run the TCP sync test."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Test TCP Sync')
    parser.add_argument('--mode', choices=['server', 'client', 'both'], default='both',
                      help='Run as server, client, or both (default: both)')
    parser.add_argument('--host', default='127.0.0.1',
                      help='Server host (for client mode)')
    parser.add_argument('--port', type=int, default=5001,
                      help='Server port (default: 5001)')
    args = parser.parse_args()
    
    tasks = []
    
    try:
        if args.mode in ['server', 'both']:
            server = TestServer(args.port)
            server_task = asyncio.create_task(server.start())
            tasks.append(server_task)
        
        if args.mode in ['client', 'both']:
            # In 'both' mode, give the server a moment to start
            if args.mode == 'both':
                await asyncio.sleep(1)
                
            client = TestClient(args.host, args.port)
            if await client.connect():
                # Send a few test messages
                for i in range(3):
                    await client.send_test_message(f"Test message {i+1}")
                    await asyncio.sleep(1)
                
                # Keep the client running for a bit longer
                await asyncio.sleep(2)
                await client.disconnect()
        
        # Wait for all tasks to complete
        await asyncio.gather(*tasks, return_exceptions=True)
        
    except asyncio.CancelledError:
        logger.info("Test interrupted")
    except Exception as e:
        logger.error(f"Test error: {e}")
    finally:
        # Clean up
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)

if __name__ == "__main__":
    try:
        asyncio.run(run_test())
    except KeyboardInterrupt:
        logger.info("Test stopped by user")
