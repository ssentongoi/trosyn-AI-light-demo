"""
SQLite storage for sync items and metadata.
"""

import json
import logging
import sqlite3
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


@dataclass
class SyncItem:
    """Represents an item to be synced."""

    item_id: str
    item_type: str  # 'document', 'document_version', 'metadata', etc.
    action: str  # 'create', 'update', 'delete'
    data: Dict[str, Any]
    created_at: datetime
    node_id: str
    version: int = 1
    synced: bool = False
    synced_at: Optional[datetime] = None
    error: Optional[str] = None
    retry_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert the sync item to a dictionary."""
        result = asdict(self)
        # Convert datetime to ISO format for JSON serialization
        for field in ["created_at", "synced_at"]:
            if field in result and result[field] is not None:
                result[field] = result[field].isoformat()
        return result

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SyncItem":
        """Create a SyncItem from a dictionary."""
        # Convert ISO format strings back to datetime objects
        for field in ["created_at", "synced_at"]:
            if field in data and data[field] is not None:
                if isinstance(data[field], str):
                    data[field] = datetime.fromisoformat(data[field])
        return cls(**data)


class SQLiteSyncStorage:
    """SQLite-based storage for sync items and metadata."""

    def __init__(self, db_path: str):
        """Initialize the SQLite storage.

        Args:
            db_path: Path to the SQLite database file.
        """
        self.db_path = Path(db_path)
        self._ensure_db_exists()

    def _get_connection(self) -> sqlite3.Connection:
        """Get a database connection."""
        conn = sqlite3.connect(
            str(self.db_path),
            detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES,
        )
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_db_exists(self) -> None:
        """Ensure the database and tables exist."""
        with self._get_connection() as conn:
            # Create sync_items table
            conn.execute(
                """
            CREATE TABLE IF NOT EXISTS sync_items (
                id TEXT PRIMARY KEY,
                item_type TEXT NOT NULL,
                action TEXT NOT NULL,
                data TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL,
                node_id TEXT NOT NULL,
                version INTEGER NOT NULL DEFAULT 1,
                synced BOOLEAN NOT NULL DEFAULT 0,
                synced_at TIMESTAMP,
                error TEXT,
                retry_count INTEGER NOT NULL DEFAULT 0,
                UNIQUE(id, version)
            )
            """
            )

            # Create indexes
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_sync_items_item_type ON sync_items(item_type)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_sync_items_synced ON sync_items(synced)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_sync_items_created_at ON sync_items(created_at)"
            )

            # Create sync_metadata table
            conn.execute(
                """
            CREATE TABLE IF NOT EXISTS sync_metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP NOT NULL
            )
            """
            )

            conn.commit()

    def add_item(self, item: SyncItem) -> None:
        """Add a sync item to the storage."""
        with self._get_connection() as conn:
            conn.execute(
                """
            INSERT OR REPLACE INTO sync_items 
            (id, item_type, action, data, created_at, node_id, version, synced, synced_at, error, retry_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    item.item_id,
                    item.item_type,
                    item.action,
                    json.dumps(item.data),
                    item.created_at,
                    item.node_id,
                    item.version,
                    int(item.synced),
                    item.synced_at,
                    item.error,
                    item.retry_count,
                ),
            )
            conn.commit()

    def get_item(self, item_id: str, version: int = 1) -> Optional[SyncItem]:
        """Get a sync item by ID and version."""
        with self._get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM sync_items WHERE id = ? AND version = ?",
                (item_id, version),
            ).fetchone()

            if not row:
                return None

            return self._row_to_item(dict(row))

    def get_pending_items(
        self, item_type: Optional[str] = None, limit: int = 100, max_retries: int = 3
    ) -> List[SyncItem]:
        """Get pending sync items, optionally filtered by type."""
        query = "SELECT * FROM sync_items WHERE synced = 0 AND retry_count <= ?"
        params = [max_retries]

        if item_type:
            query += " AND item_type = ?"
            params.append(item_type)

        query += " ORDER BY created_at ASC LIMIT ?"
        params.append(limit)

        with self._get_connection() as conn:
            rows = conn.execute(query, params).fetchall()
            return [self._row_to_item(dict(row)) for row in rows]

    def mark_item_synced(
        self, item_id: str, version: int, error: Optional[str] = None
    ) -> bool:
        """Mark an item as synced or failed."""
        with self._get_connection() as conn:
            if error:
                # Increment retry count and set error
                conn.execute(
                    """
                UPDATE sync_items 
                SET synced = 0, 
                    error = ?,
                    retry_count = retry_count + 1
                WHERE id = ? AND version = ?
                """,
                    (error, item_id, version),
                )
            else:
                # Mark as synced successfully
                conn.execute(
                    """
                UPDATE sync_items 
                SET synced = 1, 
                    synced_at = ?,
                    error = NULL
                WHERE id = ? AND version = ?
                """,
                    (datetime.utcnow(), item_id, version),
                )

            conn.commit()
            return conn.total_changes > 0

    def get_metadata(self, key: str, default: Any = None) -> Any:
        """Get a metadata value."""
        with self._get_connection() as conn:
            row = conn.execute(
                "SELECT value FROM sync_metadata WHERE key = ?", (key,)
            ).fetchone()

            if not row:
                return default

            try:
                return json.loads(row[0])
            except json.JSONDecodeError:
                return row[0]

    def set_metadata(self, key: str, value: Any) -> None:
        """Set a metadata value."""
        with self._get_connection() as conn:
            conn.execute(
                """
            INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
            VALUES (?, ?, ?)
            """,
                (key, json.dumps(value), datetime.utcnow()),
            )
            conn.commit()

    def get_sync_status(self) -> Dict[str, Any]:
        """Get sync status summary."""
        with self._get_connection() as conn:
            # Get counts by status
            status_counts = dict(
                conn.execute(
                    """
                SELECT synced, COUNT(*) as count 
                FROM sync_items 
                GROUP BY synced
            """
                ).fetchall()
            )

            # Get counts by type
            type_counts = dict(
                conn.execute(
                    """
                SELECT item_type, COUNT(*) as count 
                FROM sync_items 
                GROUP BY item_type
            """
                ).fetchall()
            )

            # Get last sync time
            last_sync = conn.execute(
                """
                SELECT MAX(synced_at) as last_sync 
                FROM sync_items 
                WHERE synced = 1
            """
            ).fetchone()[0]

            return {
                "pending": status_counts.get(0, 0),
                "synced": status_counts.get(1, 0),
                "by_type": type_counts,
                "last_sync": last_sync,
            }

    def _row_to_item(self, row: Dict[str, Any]) -> SyncItem:
        """Convert a database row to a SyncItem."""
        data = dict(row)
        data["data"] = json.loads(data["data"])
        data["synced"] = bool(data["synced"])
        return SyncItem.from_dict(data)

    def clear(self) -> None:
        """Clear all sync data (for testing)."""
        with self._get_connection() as conn:
            conn.execute("DELETE FROM sync_items")
            conn.execute("DELETE FROM sync_metadata")
            conn.commit()
