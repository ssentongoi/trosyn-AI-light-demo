"""
Storage module for LAN sync service.

This module provides storage implementations for the LAN sync service.
For backward compatibility, it re-exports the SQLite storage implementation.
"""

from .sqlite_storage import SQLiteSyncStorage, SyncItem

# For backward compatibility
InMemorySyncStorage = SQLiteSyncStorage  # Use SQLite in-memory mode as a replacement

__all__ = ["SyncItem", "SQLiteSyncStorage", "InMemorySyncStorage"]
