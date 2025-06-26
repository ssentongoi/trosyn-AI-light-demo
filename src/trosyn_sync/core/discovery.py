"""
Node Discovery Service for LAN-based service discovery.

This module implements a UDP multicast-based service discovery mechanism
that allows Trosyn nodes to find each other on the local network.
"""
import asyncio
import json
import logging
import socket
import uuid
from dataclasses import dataclass
from typing import Dict, Optional, Set, Callable, Awaitable

# Constants
MULTICAST_GROUP = '239.255.255.250'
DISCOVERY_PORT = 1900
HEARTBEAT_INTERVAL = 30  # seconds

logger = logging.getLogger(__name__)


@dataclass
class NodeInfo:
    """Represents information about a discovered node."""
    node_id: str
    node_type: str  # 'TROSYSN_ADMIN_HUB' or 'TROSYSN_DEPT_NODE'
    ip: str
    port: int
    last_seen: float


class DiscoveryService:
    """Service for discovering and announcing nodes on the local network."""

    def __init__(self, node_type: str, port: int, on_node_discovered: Optional[Callable[[NodeInfo], Awaitable[None]]] = None):
        """Initialize the discovery service.
        
        Args:
            node_type: Type of this node ('TROSYSN_ADMIN_HUB' or 'TROSYSN_DEPT_NODE')
            port: Port number this node is serving on
            on_node_discovered: Async callback when a new node is discovered
        """
        self.node_id = str(uuid.uuid4())
        self.node_type = node_type
        self.port = port
        self.on_node_discovered = on_node_discovered or (lambda _: None)
        
        # Track discovered nodes
        self.nodes: Dict[str, NodeInfo] = {}
        
        # Networking
        self._transport = None
        self._protocol = None
        self._announce_task = None
        self._running = False

    async def start(self):
        """Start the discovery service."""
        if self._running:
            return
            
        self._running = True
        
        # Create UDP socket for multicast
        loop = asyncio.get_running_loop()
        self._transport, self._protocol = await loop.create_datagram_endpoint(
            lambda: DiscoveryProtocol(self._handle_message, self.node_id),
            local_addr=('0.0.0.0', DISCOVERY_PORT),
            reuse_port=True,
            allow_broadcast=True,
        )
        
        # Join multicast group
        sock = self._transport.get_extra_info('socket')
        group = socket.inet_aton(MULTICAST_GROUP)
        mreq = group + socket.inet_aton('0.0.0.0')
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
        
        # Start announcing presence
        self._announce_task = asyncio.create_task(self._announce_loop())
        logger.info(f"Discovery service started (Node ID: {self.node_id})")

    async def stop(self):
        """Stop the discovery service."""
        if not self._running:
            return
            
        self._running = False
        
        if self._announce_task:
            self._announce_task.cancel()
            try:
                await self._announce_task
            except asyncio.CancelledError:
                pass
        
        if self._transport:
            self._transport.close()
        
        logger.info("Discovery service stopped")

    async def _announce_loop(self):
        """Periodically announce this node's presence on the network."""
        while self._running:
            try:
                await self._announce()
                await asyncio.sleep(HEARTBEAT_INTERVAL)
            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.error(f"Error in announce loop: {e}")
                await asyncio.sleep(5)  # Back off on error

    async def _announce(self):
        """Announce this node's presence on the network."""
        if not self._running or not self._transport:
            return
            
        message = {
            'type': 'ANNOUNCE',
            'node_id': self.node_id,
            'node_type': self.node_type,
            'port': self.port,
            'timestamp': asyncio.get_running_loop().time()
        }
        
        try:
            self._transport.sendto(
                json.dumps(message).encode('utf-8'),
                (MULTICAST_GROUP, DISCOVERY_PORT)
            )
        except Exception as e:
            logger.error(f"Failed to send announcement: {e}")

    async def _handle_message(self, message: bytes, addr: str):
        """Handle incoming discovery messages."""
        try:
            data = json.loads(message.decode('utf-8'))
            
            # Skip our own messages
            if data.get('node_id') == self.node_id:
                return
                
            node_id = data['node_id']
            node_type = data['node_type']
            port = data['port']
            
            # Update node info
            node_info = NodeInfo(
                node_id=node_id,
                node_type=node_type,
                ip=addr[0],
                port=port,
                last_seen=asyncio.get_running_loop().time()
            )
            
            is_new = node_id not in self.nodes
            self.nodes[node_id] = node_info
            
            if is_new:
                logger.info(f"Discovered new {node_type} node: {node_id} at {addr[0]}:{port}")
                await self.on_node_discovered(node_info)
            
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning(f"Invalid discovery message from {addr}: {e}")
        except Exception as e:
            logger.error(f"Error handling discovery message: {e}")


class DiscoveryProtocol(asyncio.DatagramProtocol):
    """UDP protocol for handling discovery messages."""
    
    def __init__(self, message_handler, node_id: str):
        self.message_handler = message_handler
        self.node_id = node_id
        self.transport = None
    
    def connection_made(self, transport):
        self.transport = transport
    
    def datagram_received(self, data, addr):
        asyncio.create_task(self.message_handler(data, addr[0]))
    
    def error_received(self, exc):
        logger.error(f"Discovery protocol error: {exc}")
    
    def connection_lost(self, exc):
        logger.info("Discovery connection closed")
        if exc:
            logger.error(f"Discovery connection lost: {exc}")
