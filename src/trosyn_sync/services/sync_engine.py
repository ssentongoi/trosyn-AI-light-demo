"""
Document synchronization engine for Trosyn Sync.

Handles the core logic for synchronizing documents between nodes.
"""
import asyncio
import contextlib
import hashlib
import json
import logging
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
            async with self.http_client as client:
                response = await client.get(
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
        """Determine what sync actions are needed between local and remote manifests."""
        actions = []
        
        # Index remote documents by ID for faster lookup
        remote_docs = {
            doc["document_id"]: doc 
            for doc in remote_manifest.get("documents", [])
        }
        
        # Check local documents against remote
        for local_doc in local_manifest.get("documents", []):
            doc_id = local_doc["document_id"]
            
            if doc_id not in remote_docs:
                # Document exists locally but not remotely - push to remote
                actions.append({
                    "action": "push",
                    "document_id": doc_id,
                    "version_id": local_doc["version_id"],
                    "reason": "exists_locally_only"
                })
            else:
                # Document exists in both - check versions
                remote_doc = remote_docs[doc_id]
                if local_doc["version_hash"] != remote_doc["version_hash"]:
                    # Different versions - need to resolve conflict
                    local_updated = datetime.fromisoformat(local_doc["updated_at"]) if local_doc["updated_at"] else datetime.min
                    remote_updated = datetime.fromisoformat(remote_doc["updated_at"]) if remote_doc["updated_at"] else datetime.min
                    
                    if local_updated > remote_updated:
                        # Local version is newer - push to remote
                        actions.append({
                            "action": "push",
                            "document_id": doc_id,
                            "version_id": local_doc["version_id"],
                            "reason": "local_version_newer"
                        })
                    else:
                        # Remote version is newer - pull from remote
                        actions.append({
                            "action": "pull",
                            "document_id": doc_id,
                            "version_id": remote_doc["version_id"],
                            "reason": "remote_version_newer"
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
        """Execute the determined sync actions."""
        results = {
            "pushed": [],
            "pulled": [],
            "errors": []
        }
        
        for action in actions:
            try:
                if action["action"] == "push":
                    result = await self._push_document(
                        action["document_id"],
                        action["version_id"],
                        remote_node.api_url
                    )
                    results["pushed"].append({
                        "document_id": action["document_id"],
                        "version_id": action["version_id"],
                        "result": result
                    })
                elif action["action"] == "pull":
                    result = await self._pull_document(
                        action['document_id'],
                        action['version_id'],
                        remote_node.api_url,
                        remote_node.id
                    )
                    results["pulled"].append({
                        "document_id": action["document_id"],
                        "version_id": action["version_id"],
                        "result": result
                    })
            except Exception as e:
                logger.error(
                    f"Failed to execute sync action {action}: {str(e)}",
                    exc_info=True
                )
                results["errors"].append({
                    "action": action,
                    "error": str(e)
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
            async with self.http_client as client:
                # Get document metadata
                metadata_response = await client.get(
                    metadata_url,
                    timeout=HTTP_REQUEST_TIMEOUT
                )
                metadata_response.raise_for_status()
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
