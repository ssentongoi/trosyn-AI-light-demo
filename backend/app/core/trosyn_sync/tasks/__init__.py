"""
Background tasks for the Trosyn Sync service.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models.node import Node, NodeSyncStatus
from ..services.sync_engine import SyncEngine

logger = logging.getLogger(__name__)


class TaskManager:
    """Manages background tasks for the sync service."""

    def __init__(self):
        """Initialize the task manager."""
        self._tasks: Dict[str, asyncio.Task] = {}
        self._running = False

    async def start(self) -> None:
        """Start all background tasks."""
        if self._running:
            return

        self._running = True

        # Start periodic sync task
        self._tasks["periodic_sync"] = asyncio.create_task(self._periodic_sync_loop())

        logger.info("Background tasks started")

    async def stop(self) -> None:
        """Stop all background tasks."""
        if not self._running:
            return

        self._running = False

        # Cancel all tasks
        for task_name, task in self._tasks.items():
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    logger.info(f"Task {task_name} cancelled")
                except Exception as e:
                    logger.error(f"Error cancelling task {task_name}: {e}")

        self._tasks.clear()
        logger.info("Background tasks stopped")

    async def _periodic_sync_loop(self) -> None:
        """Periodically sync with other nodes."""
        logger.info("Starting periodic sync loop")

        while self._running:
            try:
                # Get current time for logging
                start_time = datetime.utcnow()

                # Get database session
                db = next(get_db())

                try:
                    # Get all nodes that need syncing
                    nodes_to_sync = (
                        db.query(Node)
                        .join(
                            NodeSyncStatus,
                            Node.node_id == NodeSyncStatus.remote_node_id,
                        )
                        .filter(
                            Node.is_online == True,  # noqa
                            NodeSyncStatus.node_id == settings.NODE_ID,
                            NodeSyncStatus.sync_status.in_(["idle", "error"]),
                        )
                        .all()
                    )

                    logger.info(f"Found {len(nodes_to_sync)} nodes to sync with")

                    # Sync with each node
                    for node in nodes_to_sync:
                        try:
                            logger.info(
                                f"Syncing with node {node.node_id} ({node.display_name})"
                            )

                            # Create sync engine for this node
                            sync_engine = SyncEngine(db, settings.NODE_ID)

                            # Perform sync
                            result = await sync_engine.sync_with_node(node.node_id)

                            logger.info(
                                f"Sync with node {node.node_id} completed: "
                                f"{result.get('actions_taken', 0)} actions taken"
                            )

                        except Exception as e:
                            logger.error(
                                f"Error syncing with node {node.node_id}: {e}",
                                exc_info=True,
                            )

                except Exception as e:
                    logger.error(f"Error in sync loop: {e}", exc_info=True)

                finally:
                    db.close()

                # Calculate sleep time to maintain the sync interval
                elapsed = (datetime.utcnow() - start_time).total_seconds()
                sleep_time = max(0, settings.SYNC_INTERVAL - elapsed)

                logger.debug(
                    f"Sync cycle completed in {elapsed:.2f}s, "
                    f"sleeping for {sleep_time:.2f}s"
                )

                # Sleep until next sync cycle
                await asyncio.sleep(sleep_time)

            except asyncio.CancelledError:
                logger.info("Periodic sync loop cancelled")
                raise

            except Exception as e:
                logger.error(f"Unexpected error in sync loop: {e}", exc_info=True)
                # Prevent tight loop on error
                await asyncio.sleep(60)

    async def trigger_immediate_sync(
        self, node_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Trigger an immediate sync with one or all nodes.

        Args:
            node_id: Optional node ID to sync with. If None, sync with all nodes.

        Returns:
            Dictionary with sync status
        """
        db = next(get_db())
        try:
            nodes = []
            if node_id:
                node = db.query(Node).filter(Node.node_id == node_id).first()
                if node:
                    nodes.append(node)
            else:
                nodes = db.query(Node).filter(Node.is_online == True).all()  # noqa

            results = {}
            for node in nodes:
                try:
                    sync_engine = SyncEngine(db, settings.NODE_ID)
                    result = await sync_engine.sync_with_node(node.node_id)
                    results[node.node_id] = {"status": "success", "result": result}
                except Exception as e:
                    results[node.node_id] = {"status": "error", "error": str(e)}

            return {
                "status": "completed",
                "timestamp": datetime.utcnow().isoformat(),
                "results": results,
            }

        except Exception as e:
            logger.error(f"Error triggering immediate sync: {e}", exc_info=True)
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }
        finally:
            db.close()


# Global task manager instance
task_manager = TaskManager()
