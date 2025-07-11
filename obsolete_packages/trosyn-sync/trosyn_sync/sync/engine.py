from typing import Dict, List, Set, Tuple, Optional
import asyncio
import datetime

from ..storage import dummy
from ..client.api_client import ApiClient
from ..logging_config import logger
from ..schemas.sync import SyncRequest, SyncPlan, DocumentVersion
from ..storage.models import Document, ConflictInfo

class ConflictResolutionStrategy:
    """Defines strategies for resolving document conflicts."""
    
    @staticmethod
    async def last_write_wins(local_doc: Document, remote_doc: Document) -> Document:
        """Resolves conflict by keeping the most recently modified version."""
        local_time = local_doc.last_modified
        remote_time = remote_doc.last_modified
        
        if remote_time > local_time:
            return remote_doc
        return local_doc
    
    @staticmethod
    async def merge_with_conflict(local_doc: Document, remote_doc: Document) -> Document:
        """Marks documents as conflicting and keeps both versions."""
        if local_doc.version >= remote_doc.version:
            # Local version is newer or same, mark remote as conflict
            local_doc.add_conflict(
                node_id=remote_doc.last_modified_by or "unknown",
                version=remote_doc.version,
                content=remote_doc.content
            )
            return local_doc
        else:
            # Remote version is newer, mark local as conflict
            remote_doc.add_conflict(
                node_id=local_doc.last_modified_by or "unknown",
                version=local_doc.version,
                content=local_doc.content
            )
            return remote_doc

class SyncEngine:
    """Handles the logic of comparing manifests and creating a sync plan with conflict resolution."""
    
    def __init__(self, conflict_strategy: str = "merge_with_conflict"):
        """Initialize the sync engine with a conflict resolution strategy.
        
        Args:
            conflict_strategy: Strategy to use for conflict resolution.
                             One of: 'last_write_wins', 'merge_with_conflict'
        """
        self.conflict_strategy = getattr(ConflictResolutionStrategy, conflict_strategy)

    async def get_sync_plan(self, remote_manifest_request: SyncRequest) -> SyncPlan:
        """Compares a remote manifest to the local one and determines the sync plan.
        
        Args:
            remote_manifest_request: The sync request containing the remote manifest.
            
        Returns:
            A SyncPlan object containing the synchronization actions needed.
        """
        local_manifest = await dummy.get_document_manifest()
        remote_manifest = remote_manifest_request.manifest

        # Convert to dictionaries for easier access
        local_docs = {doc.id: doc for doc in local_manifest}
        remote_versions = {doc.id: doc.version for doc in remote_manifest}

        local_ids = set(local_docs.keys())
        remote_ids = set(remote_versions.keys())

        to_push: List[DocumentVersion] = []
        to_fetch: List[DocumentVersion] = []
        in_sync: List[DocumentVersion] = []

        # Documents this node has that the remote doesn't
        for doc_id in local_ids - remote_ids:
            doc = local_docs[doc_id]
            to_push.append(DocumentVersion(id=doc_id, version=doc.version))

        # Documents the remote has that this node doesn't
        for doc_id in remote_ids - local_ids:
            to_fetch.append(DocumentVersion(id=doc_id, version=remote_versions[doc_id]))

        # Documents both have, check for conflicts and versions
        common_docs = local_ids.intersection(remote_ids)
        for doc_id in common_docs:
            local_doc = local_docs[doc_id]
            remote_version = remote_versions[doc_id]  # Get the version from the remote_versions dict
            
            # Get the full remote document from the request if available
            remote_doc = next((doc for doc in remote_manifest_request.documents if hasattr(doc, 'id') and doc.id == doc_id), None)
            
            if local_doc.version == remote_version:
                # If we have the full remote doc, check for content conflicts
                if remote_doc and hasattr(remote_doc, 'content') and local_doc.content != remote_doc.content:
                    # Conflict detected - add to download to get the remote version
                    to_fetch.append(DocumentVersion(id=doc_id, version=remote_version))
                else:
                    # No conflict, documents are identical
                    in_sync.append(DocumentVersion(id=doc_id, version=local_doc.version))
            elif local_doc.version > remote_version:
                # Local version is newer, push to remote
                to_push.append(DocumentVersion(id=doc_id, version=local_doc.version))
            else:
                # Remote version is newer, fetch from remote
                to_fetch.append(DocumentVersion(id=doc_id, version=remote_version))

        return SyncPlan(
            node_id=remote_manifest_request.node_id,
            documents_to_download=to_fetch,
            documents_to_upload=to_push,
        )

    async def _resolve_conflict(self, local_doc: Document, remote_doc: Document) -> Document:
        """Resolves a conflict between local and remote document versions.
        
        Args:
            local_doc: The local version of the document.
            remote_doc: The remote version of the document.
            
        Returns:
            The resolved document that should be saved.
        """
        logger.info(f"Resolving conflict for document {local_doc.id} "
                   f"(local v{local_doc.version} vs remote v{remote_doc.version})")
        
        # Use the configured conflict resolution strategy
        resolved_doc = await self.conflict_strategy(local_doc, remote_doc)
        resolved_doc.last_modified = datetime.datetime.utcnow().isoformat()
        
        if resolved_doc.has_conflicts():
            logger.warning(f"Document {resolved_doc.id} has unresolved conflicts. "
                         f"Conflicts: {len(resolved_doc.conflicts)}")
        
        return resolved_doc

    async def execute_sync_plan(self, peer_url: str, plan: SyncPlan):
        """Executes a sync plan by fetching documents from a peer.
        
        Args:
            peer_url: The base URL of the peer to sync with.
            plan: The sync plan to execute.
        """
        if not plan.documents_to_download and not plan.documents_to_upload:
            logger.info(f"No documents to sync with {peer_url}.")
            return

        logger.info(f"Executing sync plan for peer {peer_url}. "
                   f"Downloading {len(plan.documents_to_download)} documents, "
                   f"uploading {len(plan.documents_to_upload)} documents.")
        
        api_client = ApiClient(base_url=peer_url)
        try:
            # Handle downloads first
            if plan.documents_to_download:
                logger.info(f"Downloading {len(plan.documents_to_download)} documents...")
                for doc_version in plan.documents_to_download:
                    await self._process_document_download(api_client, doc_version)
            
            # Then handle uploads
            if plan.documents_to_upload:
                logger.info(f"Uploading {len(plan.documents_to_upload)} documents...")
                for doc_version in plan.documents_to_upload:
                    await self._process_document_upload(api_client, doc_version)
                    
        except Exception as e:
            logger.error(f"Error during sync with {peer_url}: {str(e)}", exc_info=True)
            raise
        finally:
            await api_client.close()
    
    async def _process_document_download(self, api_client: ApiClient, doc_version: DocumentVersion):
        """Process a single document download, handling conflicts if they occur."""
        doc_id = doc_version.id
        try:
            logger.info(f"Fetching document {doc_id} (v{doc_version.version})...")
            doc_data = await api_client.get_document(doc_id)
            
            if not doc_data:
                logger.warning(f"Failed to fetch document {doc_id} from peer.")
                return
                
            remote_doc = Document(**doc_data)
            local_doc = await dummy.get_document_by_id(doc_id)
            
            if local_doc:
                # Check if there's a conflict (either different versions or same version but different content)
                if local_doc.version != remote_doc.version or local_doc.content != remote_doc.content:
                    logger.info(f"Conflict detected for document {doc_id} "
                              f"(local v{local_doc.version} vs remote v{remote_doc.version})")
                    resolved_doc = await self._resolve_conflict(local_doc, remote_doc)
                    await dummy.save_document(resolved_doc)
                    logger.info(f"Resolved conflict for document {doc_id}")
                else:
                    # No conflict, just save the remote version
                    await dummy.save_document(remote_doc)
            else:
                # New document
                await dummy.save_document(remote_doc)
                
            logger.info(f"Successfully processed document {doc_id}")
            
        except Exception as e:
            logger.error(f"Error processing document {doc_id}: {str(e)}", exc_info=True)
            raise
    
    async def _process_document_upload(self, api_client: ApiClient, doc_version: DocumentVersion):
        """Process a single document upload to a peer."""
        doc_id = doc_version.id
        try:
            local_doc = await dummy.get_document_by_id(doc_id)
            if not local_doc:
                logger.warning(f"Local document {doc_id} not found for upload")
                return
                
            # Here you would typically have an API endpoint to upload the document
            # For now, we'll just log the upload
            logger.info(f"Would upload document {doc_id} (v{local_doc.version}) to peer")
            
        except Exception as e:
            logger.error(f"Error preparing document {doc_id} for upload: {str(e)}", exc_info=True)
            raise
