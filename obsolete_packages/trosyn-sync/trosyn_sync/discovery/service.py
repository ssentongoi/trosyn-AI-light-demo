import asyncio
import json
import socket
import struct
import time
from typing import Dict

import asyncio_dgram

from ..client.api_client import ApiClient
from ..config import settings
from ..logging_config import logger
from ..schemas.sync import DocumentVersion, SyncRequest
from ..sync.engine import SyncEngine
from .models import Message, NodeInfo

MULTICAST_GROUP = "224.0.0.251"
MULTICAST_PORT = 54321


class DiscoveryService:
    """Handles node discovery, registry, and periodic synchronization."""

    def __init__(self):
        self.node_info = NodeInfo(
            id=settings.NODE_ID, name=settings.NODE_NAME, port=settings.SYNC_PORT
        )
        self.transport = None
        self.listener_task = None
        self.advertiser_task = None
        self.registry_cleaner_task = None
        self.periodic_sync_task = None
        self.registry: Dict[str, NodeInfo] = {}
        self.sync_engine = SyncEngine()
        self.cleanup_interval = settings.SYNC_INTERVAL * 3

    async def start(self):
        """Starts all discovery service background tasks."""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            if hasattr(socket, 'SO_REUSEPORT'):
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
            sock.bind(("", MULTICAST_PORT))
            group = socket.inet_aton(MULTICAST_GROUP)
            mreq = struct.pack("4sL", group, socket.INADDR_ANY)
            sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
            sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_LOOP, 1)
            # Set a short TTL to prevent packets from leaving the local network
            sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 1)
            self.transport = await asyncio_dgram.from_socket(sock)

            self.listener_task = asyncio.create_task(self._listen())
            self.advertiser_task = asyncio.create_task(self._advertise())
            self.registry_cleaner_task = asyncio.create_task(self._clean_registry())
            self.periodic_sync_task = asyncio.create_task(self._periodic_sync())
            logger.info(
                f"Discovery service started. Listening on {MULTICAST_GROUP}:{MULTICAST_PORT}"
            )
        except Exception as e:
            logger.error(f"Failed to start discovery service: {e}")
            raise

    async def stop(self):
        """Stops all discovery service background tasks."""
        logger.info("Stopping discovery service...")
        for task in [
            self.advertiser_task,
            self.listener_task,
            self.registry_cleaner_task,
            self.periodic_sync_task,
        ]:
            if task:
                task.cancel()
        if self.transport:
            self.transport.close()
        logger.info("Discovery service stopped.")

    async def _listen(self):
        """Listens for multicast packets and processes them."""
        while True:
            try:
                data, addr = await self.transport.recv()
                logger.info(f"Received discovery packet from {addr}: {data.decode()}")
                self._process_packet(data, addr[0])
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in discovery listener: {e}")

    async def _advertise(self):
        """Periodically broadcasts this node's presence."""
        message = Message(node_id=self.node_info.id, node_name=self.node_info.name, port=self.node_info.port)
        message_bytes = message.model_dump_json().encode("utf-8")
        while True:
            try:
                await self.transport.send(message_bytes, (MULTICAST_GROUP, MULTICAST_PORT))
                await asyncio.sleep(settings.SYNC_INTERVAL)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in discovery advertiser: {e}")

    def _process_packet(self, data: bytes, address: str):
        """Parses a discovery packet and updates the node registry."""
        try:
            msg = Message.parse_raw(data)
            if msg.node_id == self.node_info.id:
                logger.info(f"Ignoring discovery packet from self ({self.node_info.id}).")
                return

            self.registry[msg.node_id] = NodeInfo(
                id=msg.node_id,
                name=msg.node_name,
                port=msg.port,
                address=address,
                last_seen=time.time(),
            )
            logger.info(f"Discovered/updated peer: {msg.node_name} ({msg.node_id})")
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError) as e:
            logger.warning(f"Received malformed packet from {address}: {e}")

    async def _clean_registry(self):
        """Periodically removes stale nodes from the registry."""
        while True:
            await asyncio.sleep(self.cleanup_interval)
            now = time.time()
            stale_nodes = [
                node_id
                for node_id, node_info in self.registry.items()
                if now - node_info.last_seen > self.cleanup_interval
            ]
            if stale_nodes:
                for node_id in stale_nodes:
                    del self.registry[node_id]
                    logger.info(f"Removed stale peer from registry: {node_id}")

    async def _periodic_sync(self):
        """Periodically synchronizes with all known peers."""
        await asyncio.sleep(5)  # Initial delay
        while True:
            logger.info("Starting periodic sync run...")
            peers = list(self.registry.values())

            for peer in peers:
                logger.info(f"Initiating sync with peer {peer.name} ({peer.id})")
                peer_url = f"http://{peer.address}:{peer.port}"
                api_client = ApiClient(base_url=peer_url)
                try:
                    remote_manifest_data = await api_client.get_document_manifest()
                    if not remote_manifest_data or "manifest" not in remote_manifest_data:
                        logger.warning(f"Could not get a valid manifest from {peer.name}. Skipping.")
                        continue

                    remote_manifest = [
                        DocumentVersion(**doc)
                        for doc in remote_manifest_data["manifest"]
                    ]
                    
                    # The node_id of the peer is required for the sync request
                    sync_request = SyncRequest(node_id=peer.id, manifest=remote_manifest)
                    sync_plan = self.sync_engine.get_sync_plan(sync_request)

                    # The plan contains documents_to_download, not to_fetch
                    if sync_plan.documents_to_download:
                        logger.info(f"Found {len(sync_plan.documents_to_download)} documents to download from {peer.name}.")
                        await self.sync_engine.execute_sync_plan(peer_url, sync_plan)
                    else:
                        logger.info(f"Node is already in sync with peer {peer.name}.")

                except Exception as e:
                    logger.error(f"An error occurred during sync with peer {peer.name}: {e}")
                finally:
                    await api_client.close()

            logger.info(f"Periodic sync run finished. Waiting {settings.SYNC_INTERVAL}s.")
            await asyncio.sleep(settings.SYNC_INTERVAL)
