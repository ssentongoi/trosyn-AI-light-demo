"""
LAN Discovery Service

This module handles device discovery over the local network using UDP multicast.
"""

from __future__ import annotations

import asyncio
import json
import logging

# Import settings from the main config
import os
import socket
import sys
import time
from dataclasses import asdict, dataclass
from typing import Awaitable, Callable, Dict, List, Optional, Set

from typing_extensions import Protocol

# Add the parent directory to the path to allow absolute imports
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
from trosyn_sync.config import settings

# Configure logging
logger = logging.getLogger(__name__)

# Default multicast settings
DEFAULT_MULTICAST_GROUP = "239.255.43.21"  # Arbitrarily chosen multicast group
DEFAULT_MULTICAST_PORT = 5000
DISCOVERY_INTERVAL = 30  # seconds between discovery broadcasts


class DiscoveryCallback(Protocol):
    """Protocol for discovery event callbacks."""

    async def __call__(self, device: "DeviceInfo") -> None: ...


@dataclass
class DeviceInfo:
    """Information about a discovered device."""

    node_id: str
    node_name: str
    ip_address: str
    port: int
    last_seen: float
    capabilities: List[str] = None
    metadata: Dict[str, Any] = None

    def is_online(self, timeout: float = DISCOVERY_INTERVAL * 3) -> bool:
        """Check if the device is considered online."""
        return (time.time() - self.last_seen) < timeout

    def to_dict(self) -> Dict[str, Any]:
        """Convert device info to dictionary."""
        return {
            "node_id": self.node_id,
            "node_name": self.node_name,
            "ip_address": self.ip_address,
            "port": self.port,
            "capabilities": self.capabilities or [],
            "metadata": self.metadata or {},
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DeviceInfo":
        """Create DeviceInfo from dictionary."""
        return cls(
            node_id=data["node_id"],
            node_name=data["node_name"],
            ip_address=data["ip_address"],
            port=data.get("port", DEFAULT_MULTICAST_PORT + 1),
            last_seen=time.time(),
            capabilities=data.get("capabilities", []),
            metadata=data.get("metadata", {}),
        )


class DiscoveryService:
    """Service for discovering other nodes on the local network."""

    def __init__(
        self,
        node_id: str,
        node_name: str,
        multicast_group: str = DEFAULT_MULTICAST_GROUP,
        port: int = DEFAULT_MULTICAST_PORT,
        discovery_interval: int = DISCOVERY_INTERVAL,
    ):
        """Initialize the discovery service.

        Args:
            node_id: Unique identifier for this node
            node_name: Human-readable name for this node
            multicast_group: Multicast group address
            port: Port for multicast communication
            discovery_interval: Seconds between discovery broadcasts
        """
        self.node_id = node_id
        self.node_name = node_name
        self.multicast_group = multicast_group
        self.port = port
        self.discovery_interval = discovery_interval

        # Track discovered devices
        self._devices: Dict[str, DeviceInfo] = {}
        self._callbacks: List[DiscoveryCallback] = []

        # Networking
        self._sock: Optional[socket.socket] = None
        self._running = False
        self._discovery_task: Optional[asyncio.Task] = None
        self._listener_task: Optional[asyncio.Task] = None

    def add_callback(self, callback: DiscoveryCallback) -> None:
        """Add a callback for device discovery events."""
        if callback not in self._callbacks:
            self._callbacks.append(callback)

    def remove_callback(self, callback: DiscoveryCallback) -> None:
        """Remove a callback."""
        if callback in self._callbacks:
            self._callbacks.remove(callback)

    async def start(self) -> None:
        """Start the discovery service."""
        if self._running:
            return

        self._running = True

        # Create UDP socket
        self._sock = socket.socket(
            socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP
        )
        self._sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
        self._sock.bind(("", self.port))

        # Join multicast group
        group = socket.inet_aton(self.multicast_group)
        mreq = group + socket.inet_aton("0.0.0.0")
        self._sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)

        # Start tasks
        self._listener_task = asyncio.create_task(self._listen())
        self._discovery_task = asyncio.create_task(self._broadcast_loop())

        logger.info(f"Discovery service started on {self.multicast_group}:{self.port}")

    async def stop(self) -> None:
        """Stop the discovery service."""
        if not self._running:
            return

        self._running = False

        # Cancel tasks
        if self._discovery_task:
            self._discovery_task.cancel()
            try:
                await self._discovery_task
            except asyncio.CancelledError:
                pass

        if self._listener_task:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass

        # Close socket
        if self._sock:
            self._sock.close()
            self._sock = None

        logger.info("Discovery service stopped")

    async def _broadcast_loop(self) -> None:
        """Periodically broadcast discovery messages."""
        while self._running:
            try:
                await self.broadcast_discovery()
                await asyncio.sleep(self.discovery_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in broadcast loop: {e}")
                await asyncio.sleep(5)  # Prevent tight loop on error

    async def broadcast_discovery(self) -> None:
        """Broadcast a discovery message to the local network."""
        if not self._sock:
            return

        try:
            message = {
                "type": "discovery",
                "node_id": self.node_id,
                "node_name": self.node_name,
                "timestamp": time.time(),
                "port": self.port + 1,  # Default service port is discovery port + 1
                "capabilities": ["sync"],
            }

            # Send to multicast group using run_in_executor
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: self._sock.sendto(
                    json.dumps(message).encode("utf-8"),
                    (self.multicast_group, self.port),
                ),
            )

        except Exception as e:
            logger.error(f"Error broadcasting discovery: {e}")

    async def _listen(self) -> None:
        """Listen for incoming discovery messages."""
        loop = asyncio.get_event_loop()

        while self._running and self._sock:
            try:
                # Create a future for the socket read
                data, addr = await loop.run_in_executor(
                    None, lambda: self._sock.recvfrom(4096)
                )
                if data:
                    await self._handle_message(data, addr)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in discovery listener: {e}")
                await asyncio.sleep(1)  # Prevent tight loop on error

    async def _handle_message(self, data: bytes, addr: tuple) -> None:
        """Handle an incoming discovery message."""
        try:
            message = json.loads(data.decode("utf-8"))

            # Validate message
            if not isinstance(message, dict) or "type" not in message:
                logger.warning("Received invalid discovery message")
                return

            if message["type"] == "discovery":
                await self._handle_discovery(message, addr[0])

        except json.JSONDecodeError:
            logger.warning("Received non-JSON discovery message")
        except Exception as e:
            logger.error(f"Error handling discovery message: {e}")

    async def _handle_discovery(self, message: dict, ip_address: str) -> None:
        """Handle a discovery message from another node."""
        node_id = message.get("node_id")

        # Ignore our own messages
        if node_id == self.node_id:
            return

        # Update device info
        device = DeviceInfo(
            node_id=node_id,
            node_name=message.get("node_name", "Unknown"),
            ip_address=ip_address,
            port=message.get("port", self.port + 1),
            last_seen=time.time(),
            capabilities=message.get("capabilities", []),
            metadata={"last_discovery": time.time(), "source": "multicast"},
        )

        # Check if this is a new device
        is_new = node_id not in self._devices
        self._devices[node_id] = device

        # Notify callbacks
        if is_new:
            logger.info(
                f"Discovered new device: {device.node_name} ({device.ip_address})"
            )
            await self._notify_callbacks(device)

    async def _notify_callbacks(self, device: DeviceInfo) -> None:
        """Notify all registered callbacks about a new device."""
        for callback in self._callbacks:
            try:
                await callback(device)
            except Exception as e:
                logger.error(f"Error in discovery callback: {e}")

    def get_devices(self) -> List[DeviceInfo]:
        """Get a list of all discovered devices."""
        return list(self._devices.values())

    def get_online_devices(self, timeout: float = None) -> List[DeviceInfo]:
        """Get a list of currently online devices."""
        if timeout is None:
            timeout = self.discovery_interval * 3

        return [
            device for device in self._devices.values() if device.is_online(timeout)
        ]

    async def __aenter__(self):
        """Async context manager entry."""
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.stop()
