"""
Document synchronization engine for Trosyn Sync.

Handles the core logic for synchronizing documents between nodes.
"""
import asyncio
import contextlib
import hashlib
import json
import logging
import traceback
import uuid
from datetime import datetime, timedelta
from io import BytesIO
from pathlib import Path
from typing import AsyncGenerator, BinaryIO, Dict, List, Optional, Set, Tuple, Any, Union

import httpx
from sqlalchemy.orm import Session, joinedload

from ..models.document import Document, DocumentVersion, DocumentSyncStatus
from ..models.node import Node, NodeSyncStatus, SyncQueue
from ..services.storage import storage_service
from ..core.discovery import DiscoveryService

logger = logging.getLogger(__name__)

# Timeouts in seconds
HTTP_REQUEST_TIMEOUT = 30.0
SYNC_OPERATION_TIMEOUT = 300.0
MAX_RETRIES = 3
RETRY_DELAY = 5.0

# File handling
TEMP_DIR = Path("storage/tmp")
TEMP_DIR.mkdir(parents=True, exist_ok=True)


@contextlib.asynccontextmanager
async def temp_download_file(prefix: str = "doc") -> AsyncGenerator[Path, None]:
    """Context manager for creating and cleaning up temporary download files.
    
    Args:
        prefix: Prefix for the temporary filename
        
    Yields:
        Path to the temporary file
    """
    temp_file = TEMP_DIR / f"{prefix}_{uuid.uuid4()}"
    try:
        temp_file.parent.mkdir(parents=True, exist_ok=True)
        yield temp_file
    finally:
        try:
            if temp_file.exists():
                temp_file.unlink()
        except OSError as e:
            logger.warning(f"Failed to clean up temp file {temp_file}: {e}")


class SyncEngine:
    """Handles document synchronization between nodes."""
    
    def __init__(self, db: Session, node_id: str, discovery: Optional[DiscoveryService] = None, http_client: Optional[httpx.AsyncClient] = None):
        """Initialize the sync engine.
        
        Args:
            db: Database session
            node_id: The string ID of the current node
            discovery: Optional discovery service instance
        """
        self.db = db
        self.node_id_str = node_id
        self.discovery = discovery
        self._http_client = http_client
        self._sync_lock = asyncio.Lock()
        self._running = False

        # Get the local node object from the database
        self.local_node = db.query(Node).filter(Node.node_id == self.node_id_str).first()
        if not self.local_node:
            raise ValueError(f"SyncEngine initialization failed: Node '{self.node_id_str}' not found in the database.")
        self.node_id = self.local_node.id # This is the integer PK
    
    @property
    def http_client(self) -> httpx.AsyncClient:
        """Get or create an HTTP client."""
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(
                timeout=30.0,
                limits=httpx.Limits(
                    max_connections=10,
                    max_keepalive_connections=5,
                ),
                follow_redirects=True,
            )
        return self._http_client
    
    async def start(self) -> None:
        """Start the sync engine."""
        if self._running:
            return
            
        self._running = True
        logger.info("Sync engine started")
    
    async def stop(self) -> None:
        """Stop the sync engine."""
        self._running = False
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None
        logger.info("Sync engine stopped")
    
    async def sync_with_node(self, remote_node_id: str) -> Dict[str, Any]:
        """Synchronize documents with a specific remote node.
        
        Args:
            remote_node_id: ID of the remote node to sync with
            
        Returns:
            Dictionary with sync results
        """
        async with self._sync_lock:
            # Get or create sync status
            sync_status = NodeSyncStatus.get_or_create(self.db, self.node_id, remote_node_id)
            
            # Get remote node info
            remote_node = self.db.query(Node).filter(Node.node_id == remote_node_id).first()
            if not remote_node or not remote_node.api_url:
                error_msg = f"Remote node {remote_node_id} not found or missing API URL"
                sync_status.update_sync_status(self.db, 'error', error_msg)
                raise ValueError(error_msg)
            
            try:
                # Update sync status
                sync_status.update_sync_status(self.db, 'syncing')
                
                # Step 1: Exchange document manifests
                local_manifest = await self._generate_local_manifest()
                remote_manifest = await self._fetch_remote_manifest(remote_node.api_url)
                
                # Step 2: Determine sync actions
                actions = self._determine_sync_actions(local_manifest, remote_manifest)
                
                # Step 3: Execute sync actions
                results = await self._execute_sync_actions(actions, remote_node)
                
                # Step 4: Check for errors and update status
                if results["errors"]:
                    error_summary = f"Sync completed with {len(results['errors'])} errors."
                    sync_status.update_sync_status(self.db, 'error', error_summary)
                    return {
                        "status": "error",
                        "message": error_summary,
                        "node_id": remote_node_id,
                        "actions_taken": len(actions),
                        "results": results,
                        "timestamp": datetime.utcnow().isoformat()
                    }

                # Update sync status to success if no errors
                sync_status.update_sync_status(self.db, 'success')
                
                return {
                    "status": "success",
                    "node_id": remote_node_id,
                    "actions_taken": len(actions),
                    "results": results,
                    "timestamp": datetime.utcnow().isoformat()
                }
                
            except Exception as e:
                error_msg = f"Failed to sync with node {remote_node_id}: {str(e)}"
                logger.error(error_msg, exc_info=True)
                sync_status.update_sync_status(self.db, 'error', error_msg)
                # Do not re-raise, return an error structure instead
                return {
                    "status": "error",
                    "message": error_msg,
                    "node_id": remote_node_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
    
    async def _generate_local_manifest(self) -> Dict[str, Any]:
        """Generate a manifest of local documents."""
        docs = self.db.query(Document).options(
            joinedload(Document.current_version)
        ).filter(
            Document.is_deleted == False  # noqa
        ).all()
        
        return {
            "node_id": self.node_id,
            "timestamp": datetime.utcnow().isoformat(),
            "documents": [
                {
                    "document_id": str(doc.id),
                    "version_id": str(doc.current_version_id),
                    "version_hash": doc.current_version.version_hash,
                    "size_bytes": doc.size_bytes,
                    "mime_type": doc.mime_type,
                    "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
                    "metadata": doc.metadata_ or {}
                }
                for doc in docs if doc.current_version
            ]
        }
    
    async def _fetch_remote_manifest(self, base_url: str) -> Dict[str, Any]:
        """Fetch document manifest from a remote node."""
        try:
            response = await self.http_client.get(
                f"{base_url}/api/v1/sync/documents/manifest",
                headers={"Accept": "application/json"}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to fetch remote manifest from {base_url}: {e}")
            raise
    
    def _determine_sync_actions(
        self,
        local_manifest: Dict[str, Any],
        remote_manifest: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Determine what sync actions are needed between local and remote manifests.
        
        Implements a sophisticated conflict detection algorithm that considers:
        1. Document existence (local-only, remote-only, or both)
        2. Version hashes for content changes
        3. Metadata changes
        4. Custom conflict resolution strategies
        """
        actions = []
        
        # Index remote documents by ID for faster lookup
        remote_docs = {
            doc["document_id"]: doc 
            for doc in remote_manifest.get("documents", [])
        }
        
        # Track documents we've processed to detect remote-only docs
        processed_doc_ids = set()
        
        # Check local documents against remote
        for local_doc in local_manifest.get("documents", []):
            doc_id = local_doc["document_id"]
            processed_doc_ids.add(doc_id)
            
            if doc_id not in remote_docs:
                # Document exists locally but not remotely - push to remote
                actions.append({
                    "action": "push",
                    "document_id": doc_id,
                    "version_id": local_doc["version_id"],
                    "reason": "exists_locally_only"
                })
            else:
                # Document exists in both - check for conflicts
                remote_doc = remote_docs[doc_id]
                
                # Check if versions are different
                if local_doc["version_hash"] != remote_doc["version_hash"]:
                    # Check if this is a true conflict or just an update
                    local_updated = datetime.fromisoformat(local_doc["updated_at"]) if local_doc["updated_at"] else datetime.min
                    remote_updated = datetime.fromisoformat(remote_doc["updated_at"]) if remote_doc["updated_at"] else datetime.min
                    
                    # Check if documents were modified independently (true conflict)
                    local_ancestors = set(local_doc.get("ancestors", []))
                    remote_ancestors = set(remote_doc.get("ancestors", []))
                    
                    # If there's a common ancestor, this is an edit conflict
                    has_common_ancestor = not local_ancestors.isdisjoint(remote_ancestors)
                    
                    if has_common_ancestor:
                        # True conflict - both sides have diverged from a common version
                        actions.append({
                            "action": "conflict",
                            "document_id": doc_id,
                            "local_version_id": local_doc["version_id"],
                            "remote_version_id": remote_doc["version_id"],
                            "local_updated": local_updated.isoformat(),
                            "remote_updated": remote_updated.isoformat(),
                            "reason": "diverged_changes"
                        })
                    elif local_updated > remote_updated:
                        # Local version is newer and no true conflict - push to remote
                        actions.append({
                            "action": "push",
                            "document_id": doc_id,
                            "version_id": local_doc["version_id"],
                            "reason": "local_version_newer"
                        })
                    else:
                        # Remote version is newer and no true conflict - pull from remote
                        actions.append({
                            "action": "pull",
                            "document_id": doc_id,
                            "version_id": remote_doc["version_id"],
                            "reason": "remote_version_newer"
                        })
                
                # Check for metadata-only changes
                elif local_doc.get("metadata") != remote_doc.get("metadata"):
                    # Metadata changed but content is the same - merge metadata
                    actions.append({
                        "action": "merge_metadata",
                        "document_id": doc_id,
                        "local_metadata": local_doc.get("metadata", {}),
                        "remote_metadata": remote_doc.get("metadata", {})
                    })
        
        # Check for documents that exist remotely but not locally
        local_doc_ids = {doc["document_id"] for doc in local_manifest.get("documents", [])}
        for doc_id, remote_doc in remote_docs.items():
            if doc_id not in local_doc_ids:
                # Document exists remotely but not locally - pull from remote
                actions.append({
                    "action": "pull",
                    "document_id": doc_id,
                    "version_id": remote_doc["version_id"],
                    "reason": "exists_remotely_only"
                })
        
        return actions
    
    async def _execute_sync_actions(
        self, 
        actions: List[Dict[str, Any]],
        remote_node: Node
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Execute the determined sync actions.
        
        Handles various types of sync actions including:
        - push: Push local changes to remote
        - pull: Pull remote changes to local
        - conflict: Handle conflicting changes between local and remote
        - merge_metadata: Merge metadata changes when content is the same
        """
        results = {
            "pushed": [],
            "pulled": [],
            "conflicts_resolved": [],
            "metadata_merged": [],
            "errors": []
        }
        
        for action in actions:
            try:
                action_type = action["action"]
                doc_id = action["document_id"]
                
                if action_type == "push":
                    # Push local changes to remote
                    result = await self._push_document(
                        doc_id,
                        action["version_id"],
                        remote_node.api_url
                    )
                    results["pushed"].append({
                        "document_id": doc_id,
                        "version_id": action["version_id"],
                        "result": result
                    })
                    
                elif action_type == "pull":
                    # Pull remote changes to local
                    result = await self._pull_document(
                        doc_id,
                        action['version_id'],
                        remote_node.api_url,
                        remote_node.id
                    )
                    results["pulled"].append({
                        "document_id": doc_id,
                        "version_id": action["version_id"],
                        "result": result
                    })
                    
                elif action_type == "conflict":
                    # Handle document conflicts using the configured strategy
                    resolved = await self._resolve_document_conflict(
                        doc_id=doc_id,
                        local_version_id=action["local_version_id"],
                        remote_version_id=action["remote_version_id"],
                        remote_node=remote_node
                    )
                    results["conflicts_resolved"].append({
                        "document_id": doc_id,
                        "resolved_version_id": resolved.get("version_id"),
                        "strategy_used": resolved.get("strategy"),
                        "result": resolved
                    })
                    
                elif action_type == "merge_metadata":
                    # Merge metadata when content is the same but metadata differs
                    merged = await self._merge_document_metadata(
                        doc_id=doc_id,
                        local_metadata=action["local_metadata"],
                        remote_metadata=action["remote_metadata"],
                        remote_node_id=remote_node.id
                    )
                    results["metadata_merged"].append({
                        "document_id": doc_id,
                        "merged_metadata": merged
                    })
                    
            except Exception as e:
                logger.error(
                    f"Failed to execute sync action {action}: {str(e)}",
                    exc_info=True
                )
                results["errors"].append({
                    "action": action,
                    "error": str(e),
                    "traceback": traceback.format_exc()
                })
        
        return results
    
    async def _push_document(
        self, 
        document_id: str,
        version_id: str,
        remote_base_url: str
    ) -> Dict[str, Any]:
        """Push a document version to a remote node.
        
        Args:
            document_id: ID of the document to push
            version_id: ID of the version to push
            remote_base_url: Base URL of the remote node
            
        Returns:
            Dictionary containing push operation results
            
        Raises:
            ValueError: If document or version is not found
            FileNotFoundError: If document file is missing
            httpx.HTTPStatusError: If the HTTP request fails
        """
        try:
            # Get the document and version from the database
            doc = self.db.query(Document).get(document_id)
            if not doc or not doc.current_version:
                raise ValueError(f"Document {document_id} not found or has no versions")
            
            version = next(
                (v for v in doc.versions if str(v.id) == version_id),
                None
            )
            if not version:
                raise ValueError(f"Version {version_id} not found for document {document_id}")
            
            # Get the file content
            file_path = Path(version.storage_path)
            if not file_path.exists():
                raise FileNotFoundError(f"File not found at {file_path}")
            
            # Use a context manager to ensure the file is properly closed
            with file_path.open('rb') as file_obj:
                # Prepare the file for upload
                files = {
                    'file': (
                        f"{doc.id}_{version.id}{doc.file_extension or ''}",
                        file_obj,
                        version.mime_type
                    )
                }
                
                # Prepare metadata
                metadata = {
                    'document_id': str(doc.id),
                    'version_id': str(version.id),
                    'version_hash': version.version_hash,
                    'title': doc.title,
                    'mime_type': version.mime_type,
                    'metadata': json.dumps(doc.metadata_ or {})
                }
                
                # Upload the file
                async with self.http_client as client:
                    response = await client.post(
                        f"{remote_base_url}/api/v1/sync/documents/upload",
                        data=metadata,
                        files=files,
                        timeout=HTTP_REQUEST_TIMEOUT
                    )
                    response.raise_for_status()
                    return response.json()
                    
        except Exception as e:
            logger.error(
                f"Failed to push document {document_id} version {version_id}: {str(e)}",
                exc_info=True
            )
            raise
    
    async def _resolve_document_conflict(
        self,
        doc_id: str,
        local_version_id: str,
        remote_version_id: str,
        remote_node: Node,
        strategy: str = None
    ) -> Dict[str, Any]:
        """Resolve a document conflict between local and remote versions.
        
        Implements several conflict resolution strategies:
        1. 'local_wins' - Keep the local version
        2. 'remote_wins' - Use the remote version
        3. 'newer_wins' - Use the most recently updated version
        4. 'merge' - Attempt to automatically merge changes
        5. 'duplicate' - Keep both versions with different names
        
        Args:
            doc_id: ID of the conflicting document
            local_version_id: Version ID of the local document
            remote_version_id: Version ID of the remote document
            remote_node: The remote node object
            strategy: Resolution strategy to use. If None, uses the default strategy.
            
        Returns:
            Dictionary with resolution details and results
            
        Raises:
            ValueError: If document or version not found, or invalid strategy
            RuntimeError: If conflict resolution fails
        """
        # Validate inputs
        if not doc_id or not local_version_id or not remote_version_id:
            raise ValueError("Document ID and version IDs must be provided")
            
        if not remote_node or not remote_node.api_url:
            raise ValueError("Valid remote node with API URL is required")
        
        # Get document and version details with proper error handling
        try:
            local_doc = self.db.query(Document).get(doc_id)
            if not local_doc:
                raise ValueError(f"Local document {doc_id} not found")
                
            local_version = next(
                (v for v in local_doc.versions if str(v.id) == local_version_id),
                None
            )
            if not local_version:
                raise ValueError(f"Local version {local_version_id} not found in document {doc_id}")
                
        except Exception as e:
            logger.error(f"Error accessing local document {doc_id} version {local_version_id}: {str(e)}")
            raise
        
        # Get remote version details with retry logic
        remote_metadata = None
        max_retries = 3
        retry_delay = 1.0  # seconds
        
        for attempt in range(max_retries):
            try:
                remote_metadata_url = f"{remote_node.api_url.rstrip('/')}/api/v1/documents/{doc_id}/versions/{remote_version_id}"
                logger.debug(f"Fetching remote metadata from {remote_metadata_url} (attempt {attempt + 1}/{max_retries})")
                
                response = await self.http_client.get(
                    remote_metadata_url, 
                    timeout=HTTP_REQUEST_TIMEOUT,
                    headers={"Accept": "application/json"}
                )
                response.raise_for_status()
                remote_metadata = response.json()
                break  # Success, exit retry loop
                
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    raise ValueError(f"Remote version {remote_version_id} not found on node {remote_node.node_id}") from e
                if attempt == max_retries - 1:  # Last attempt
                    raise RuntimeError(
                        f"Failed to fetch remote metadata after {max_retries} attempts. "
                        f"Status: {e.response.status_code}, Error: {str(e)}"
                    ) from e
                logger.warning(f"Attempt {attempt + 1} failed: {str(e)}. Retrying...")
                
            except (httpx.RequestError, json.JSONDecodeError) as e:
                if attempt == max_retries - 1:  # Last attempt
                    raise RuntimeError(
                        f"Failed to fetch remote metadata after {max_retries} attempts: {str(e)}"
                    ) from e
                logger.warning(f"Attempt {attempt + 1} failed: {str(e)}. Retrying...")
                
            # Exponential backoff before retry
            if attempt < max_retries - 1:
                await asyncio.sleep(retry_delay * (2 ** attempt))  # Exponential backoff
        
        if not remote_metadata:
            raise RuntimeError("Failed to fetch remote metadata after multiple attempts")
        
        # If no strategy specified, use the default from settings or 'newer_wins'
        strategy = strategy or getattr(self.local_node, 'default_conflict_strategy', 'newer_wins')
        
        resolution = {
            "document_id": doc_id,
            "local_version_id": local_version_id,
            "remote_version_id": remote_version_id,
            "strategy_used": strategy,
            "resolved_at": datetime.utcnow().isoformat(),
            "node_id": self.node_id_str,
            "remote_node_id": remote_node.node_id
        }
        
        try:
            if strategy == 'local_wins':
                # Keep local version, push it to remote
                result = await self._push_document(
                    doc_id,
                    local_version_id,
                    remote_node.api_url
                )
                resolution.update({
                    "action": "pushed_local",
                    "result": result
                })
                
            elif strategy == 'remote_wins':
                # Use remote version, pull it to local
                result = await self._pull_document(
                    doc_id,
                    remote_version_id,
                    remote_node.api_url,
                    remote_node.id
                )
                resolution.update({
                    "action": "pulled_remote",
                    "result": result
                })
                
            elif strategy == 'newer_wins':
                # Use the most recently updated version
                local_updated = local_version.created_at
                remote_updated = datetime.fromisoformat(remote_metadata['created_at'])
                
                if local_updated > remote_updated:
                    result = await self._push_document(
                        doc_id,
                        local_version_id,
                        remote_node.api_url
                    )
                    resolution.update({
                        "action": "pushed_local_newer",
                        "result": result
                    })
                else:
                    result = await self._pull_document(
                        doc_id,
                        remote_version_id,
                        remote_node.api_url,
                        remote_node.id
                    )
                    resolution.update({
                        "action": "pulled_remote_newer",
                        "result": result
                    })
                    
            elif strategy == 'merge':
                # Attempt to merge changes
                merged = await self._merge_document_versions(
                    doc_id=doc_id,
                    local_version_id=local_version_id,
                    remote_metadata=remote_metadata,
                    remote_node=remote_node
                )
                resolution.update({
                    "action": "merged",
                    "result": merged
                })
                
            elif strategy == 'duplicate':
                # Keep both versions with different names
                new_doc = await self._duplicate_document(
                    doc_id=doc_id,
                    version_id=remote_version_id,
                    remote_node=remote_node,
                    suffix="_conflict"
                )
                resolution.update({
                    "action": "duplicated",
                    "new_document_id": new_doc['id'],
                    "result": new_doc
                })
                
            else:
                raise ValueError(f"Unknown conflict resolution strategy: {strategy}")
            
            resolution["success"] = True
            
        except ValueError as ve:
            error_msg = f"Invalid input for conflict resolution: {str(ve)}"
            logger.error(error_msg, exc_info=True)
            resolution.update({
                "success": False,
                "error": error_msg,
                "error_type": "validation_error",
                "traceback": traceback.format_exc()
            })
        except httpx.HTTPStatusError as he:
            error_msg = f"HTTP error during conflict resolution: {str(he)}"
            logger.error(error_msg, exc_info=True)
            resolution.update({
                "success": False,
                "error": error_msg,
                "error_type": "http_error",
                "http_status": getattr(he.response, 'status_code', None),
                "traceback": traceback.format_exc()
            })
        except httpx.RequestError as re:
            error_msg = f"Network error during conflict resolution: {str(re)}"
            logger.error(error_msg, exc_info=True)
            resolution.update({
                "success": False,
                "error": error_msg,
                "error_type": "network_error",
                "traceback": traceback.format_exc()
            })
        except Exception as e:
            error_msg = f"Unexpected error during conflict resolution: {str(e)}"
            logger.error(error_msg, exc_info=True)
            resolution.update({
                "success": False,
                "error": error_msg,
                "error_type": "unexpected_error",
                "traceback": traceback.format_exc()
            })
        finally:
            # Ensure we log the resolution attempt, even if logging fails
            try:
                self._log_conflict_resolution(resolution)
            except Exception as log_error:
                logger.error(
                    f"Failed to log conflict resolution for document {doc_id}: {str(log_error)}",
                    exc_info=True
                )
        
        return resolution
        
    async def _merge_document_versions(
        self,
        doc_id: str,
        local_version_id: str,
        remote_metadata: Dict[str, Any],
        remote_node: Node
    ) -> Dict[str, Any]:
        """Merge two versions of a document.
        
        This is a placeholder for actual merge logic that would be implemented
        based on the document type (e.g., text, JSON, binary).
        
        Args:
            doc_id: ID of the document
            local_version_id: Version ID of the local document
            remote_metadata: Metadata of the remote version
            remote_node: The remote node object
            
        Returns:
            Dictionary with merge results
        """
        # This is a simplified merge implementation
        # In a real system, this would use format-specific merge tools
        
        # For now, we'll just keep the local version and add a note about the conflict
        local_doc = self.db.query(Document).get(doc_id)
        if not local_doc:
            raise ValueError(f"Document {doc_id} not found")
            
        # Update metadata from both versions
        local_metadata = local_doc.metadata_ or {}
        remote_meta = remote_metadata.get('metadata', {})
        
        # Merge metadata, preferring remote for conflicts
        merged_metadata = {**local_metadata, **remote_meta}
        
        # Add conflict resolution note
        conflict_note = {
            "conflict_resolution": {
                "resolved_at": datetime.utcnow().isoformat(),
                "strategy": "merge_metadata",
                "local_version": local_version_id,
                "remote_version": remote_metadata['version_id']
            }
        }
        
        if "_sync_notes" not in merged_metadata:
            merged_metadata["_sync_notes"] = []
        merged_metadata["_sync_notes"].append(conflict_note)
        
        # Update the document with merged metadata
        local_doc.metadata_ = merged_metadata
        self.db.commit()
        
        # Push the merged version back to remote
        result = await self._push_document(
            doc_id,
            local_version_id,
            remote_node.api_url
        )
        
        return {
            "document_id": doc_id,
            "merged_metadata": merged_metadata,
            "push_result": result
        }
        
    async def _merge_document_metadata(
        self,
        doc_id: str,
        local_metadata: Dict[str, Any],
        remote_metadata: Dict[str, Any],
        remote_node_id: int
    ) -> Dict[str, Any]:
        """Merge metadata from local and remote versions of a document.
        
        This is called when the document content is the same but metadata differs.
        The merge strategy is to combine all fields, with remote values taking
        precedence in case of conflicts.
        
        Args:
            doc_id: ID of the document
            local_metadata: Local metadata dictionary
            remote_metadata: Remote metadata dictionary
            remote_node_id: ID of the remote node
            
        Returns:
            Dictionary with the merged metadata and operation results
        """
        # Get the document from the database
        doc = self.db.query(Document).get(doc_id)
        if not doc:
            raise ValueError(f"Document {doc_id} not found")
            
        # Start with local metadata as base
        merged_metadata = dict(local_metadata or {})
        
        # Add a note about the metadata merge
        merge_note = {
            "metadata_merge": {
                "merged_at": datetime.utcnow().isoformat(),
                "remote_node_id": remote_node_id,
                "strategy": "remote_precedence"
            }
        }
        
        # Ensure we have a _sync_notes array
        if "_sync_notes" not in merged_metadata:
            merged_metadata["_sync_notes"] = []
            
        # Add the merge note
        merged_metadata["_sync_notes"].append(merge_note)
        
        # Merge remote metadata, allowing it to override local values
        # but preserve any local fields that don't exist in remote
        for key, value in (remote_metadata or {}).items():
            # Skip internal fields that shouldn't be overwritten
            if key.startswith('_internal_'):
                continue
                
            # Handle nested dictionaries recursively
            if (key in merged_metadata and 
                isinstance(merged_metadata[key], dict) and 
                isinstance(value, dict)):
                merged_metadata[key].update(value)
            else:
                merged_metadata[key] = value
        
        # Update the document with merged metadata
        doc.metadata_ = merged_metadata
        self.db.commit()
        
        # Return the merge result
        return {
            "document_id": doc_id,
            "merged_metadata": merged_metadata,
            "local_metadata_keys": list(local_metadata.keys()) if local_metadata else [],
            "remote_metadata_keys": list(remote_metadata.keys()) if remote_metadata else [],
            "merged_at": merge_note["metadata_merge"]["merged_at"]
        }
    
    def _log_conflict_resolution(self, resolution: Dict[str, Any]) -> None:
        """Log conflict resolution details for auditing."""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "node_id": self.node_id_str,
            "resolution": resolution
        }
        logger.info(f"Conflict resolution: {json.dumps(log_entry, default=str)}")
        
        # You could also store this in the database for auditing
        # self.db.add(ConflictResolutionLog(
        #     document_id=resolution['document_id'],
        #     resolution_details=resolution,
        #     resolved_by="system",  # or user ID if available
        #     resolved_at=datetime.utcnow()
        # ))
        # self.db.commit()
    
    async def _pull_document(
        self,
        document_id: str,
        version_id: str,
        remote_base_url: str,
        remote_node_id: int
    ) -> Dict[str, Any]:
        """Pull a document version from a remote node.
        
        Args:
            document_id: ID of the document to pull
            version_id: ID of the version to pull
            remote_base_url: Base URL of the remote node
            remote_node_id: ID of the remote node in the local database
            
        Returns:
            Dictionary containing pull operation results
            
        Raises:
            httpx.HTTPStatusError: If the HTTP request fails
        """
        # First, get document metadata
        metadata_url = f"{remote_base_url}/api/v1/sync/documents/{document_id}/versions/{version_id}"
        
        try:
            client = self.http_client
            # Get document metadata
            metadata_response = await client.get(
                metadata_url,
                timeout=HTTP_REQUEST_TIMEOUT
            )
            metadata_response.raise_for_status()
            metadata = metadata_response.json()
            
            # Download the file using our temp file utility
            temp_file = await temp_download_file(f"{document_id}_{version_id}")
            # Download the file content
            download_url = f"{remote_base_url}/api/v1/sync/documents/{document_id}/versions/{version_id}/download"
            
            response = await client.stream(
                'GET',
                download_url,
                timeout=SYNC_OPERATION_TIMEOUT
            )
            response.raise_for_status()
            
            # Stream the file to disk
            with temp_file.open('wb') as f:
                async for chunk in response.aiter_bytes():
                    f.write(chunk)
            
            # Store the document using our helper method
            with temp_file.open('rb') as f:
                return await self._store_document_version(
                    document_id=document_id,
                    version_id=version_id,
                    file_obj=f,
                    metadata=metadata,
                    remote_node_id=remote_node_id
                )
                metadata = metadata_response.json()
                
                # Download the file using our temp file utility
                async with temp_download_file(f"{document_id}_{version_id}") as temp_file:
                    # Download the file content
                    download_url = f"{remote_base_url}/api/v1/sync/documents/{document_id}/versions/{version_id}/download"
                    
                    async with client.stream(
                        'GET',
                        download_url,
                        timeout=SYNC_OPERATION_TIMEOUT
                    ) as response:
                        response.raise_for_status()
                        
                        # Stream the file to disk
                        with temp_file.open('wb') as f:
                            async for chunk in response.aiter_bytes():
                                f.write(chunk)
                    
                    # Store the document using our helper method
                    with temp_file.open('rb') as f:
                        return await self._store_document_version(
                            document_id=document_id,
                            version_id=version_id,
                            file_obj=f,
                            metadata=metadata,
                            remote_node_id=remote_node_id
                        )
                        
        except Exception as e:
            logger.error(
                f"Failed to pull document {document_id} version {version_id}: {str(e)}",
                exc_info=True
            )
            raise
