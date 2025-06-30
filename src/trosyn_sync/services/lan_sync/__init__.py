"""
LAN Sync Service for Trosyn AI

This module provides LAN-based synchronization capabilities between Trosyn AI instances,
including device discovery, authentication, and data synchronization.
"""

__version__ = "0.1.0"

from .discovery import DiscoveryService, DeviceInfo
from .protocol import ProtocolHandler, Message, MessageType
from .sqlite_storage import SyncItem, SQLiteSyncStorage

# For backward compatibility
InMemorySyncStorage = SQLiteSyncStorage  # Use SQLite in-memory mode as a replacement

__all__ = [
    'DiscoveryService', 
    'ProtocolHandler', 
    'Message', 
    'MessageType', 
    'DeviceInfo',
    'SyncItem',
    'SQLiteSyncStorage',
    'InMemorySyncStorage'
]
