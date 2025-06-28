#!/usr/bin/env python3
"""
LAN Discovery Test Script

This script demonstrates the LAN discovery functionality by starting two nodes:
1. A server node that listens for discovery requests
2. A client node that broadcasts discovery requests
"""
import asyncio
import logging
import sys
import uuid
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Add src to Python path
sys.path.insert(0, str(project_root / 'src'))

# Import LAN sync components
try:
    from trosyn_sync.services.lan_sync.discovery import DiscoveryService, DeviceInfo
    from trosyn_sync.services.lan_sync.config import LANConfig
except ImportError:
    # Fallback for direct script execution
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    from trosyn_sync.services.lan_sync.discovery import DiscoveryService, DeviceInfo
    from trosyn_sync.services.lan_sync.config import LANConfig

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('lan_discovery_test.log')
    ]
)
logger = logging.getLogger(__name__)

async def handle_discovery(device: DeviceInfo) -> None:
    """Handle a newly discovered device."""
    logger.info(f"Discovered device: {device.node_name} ({device.ip_address}:{device.port})")
    logger.info(f"  - Capabilities: {', '.join(device.capabilities or [])}")
    logger.info(f"  - Last seen: {device.last_seen}")

async def run_server() -> None:
    """Run a discovery server that responds to discovery requests."""
    config = LANConfig(
        node_id=f"server-{uuid.uuid4().hex[:8]}",
        node_name="Test Server",
        discovery_port=5000,
    )
    
    logger.info(f"Starting discovery server (ID: {config.node_id}, Name: {config.node_name})")
    
    async with DiscoveryService(
        node_id=config.node_id,
        node_name=config.node_name,
        multicast_group=config.multicast_group,
        port=config.discovery_port,
        discovery_interval=config.discovery_interval
    ) as server:
        server.add_callback(handle_discovery)
        logger.info("Server running, press Ctrl+C to stop...")
        
        try:
            while True:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            logger.info("Server stopped")

async def run_client() -> None:
    """Run a discovery client that sends discovery requests."""
    config = LANConfig(
        node_id=f"client-{uuid.uuid4().hex[:8]}",
        node_name="Test Client",
        discovery_port=5000,
    )
    
    logger.info(f"Starting discovery client (ID: {config.node_id}, Name: {config.node_name})")
    
    async with DiscoveryService(
        node_id=config.node_id,
        node_name=config.node_name,
        multicast_group=config.multicast_group,
        port=config.discovery_port,
        discovery_interval=5  # More frequent discovery for the client
    ) as client:
        client.add_callback(handle_discovery)
        
        # Send initial discovery
        await client.broadcast_discovery()
        
        try:
            while True:
                logger.info("Sending discovery broadcast...")
                await client.broadcast_discovery()
                await asyncio.sleep(10)  # Send discovery every 10 seconds
        except asyncio.CancelledError:
            logger.info("Client stopped")

async def main() -> None:
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Test LAN Discovery')
    parser.add_argument('--mode', choices=['server', 'client', 'both'], default='both',
                      help='Run as server, client, or both (default: both)')
    args = parser.parse_args()
    
    tasks = []
    
    try:
        if args.mode in ['server', 'both']:
            tasks.append(asyncio.create_task(run_server()))
        if args.mode in ['client', 'both']:
            tasks.append(asyncio.create_task(run_client()))
        
        await asyncio.gather(*tasks)
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)

if __name__ == "__main__":
    asyncio.run(main())
