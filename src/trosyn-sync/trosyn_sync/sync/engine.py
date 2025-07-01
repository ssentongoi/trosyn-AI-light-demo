from typing import Dict, List, Set

from ..storage import dummy
from ..client.api_client import ApiClient
from ..logging_config import logger
from ..schemas.sync import SyncRequest, SyncPlan, DocumentVersion
from ..storage.models import Document

class SyncEngine:
    """Handles the logic of comparing manifests and creating a sync plan."""

    def get_sync_plan(self, remote_manifest_request: SyncRequest) -> SyncPlan:
        """Compares a remote manifest to the local one and determines the sync plan."""
        local_manifest = dummy.get_document_manifest()
        remote_manifest = remote_manifest_request.manifest

        local_docs: Dict[str, int] = {doc.id: doc.version for doc in local_manifest}
        remote_docs: Dict[str, int] = {doc.id: doc.version for doc in remote_manifest}

        local_ids: Set[str] = set(local_docs.keys())
        remote_ids: Set[str] = set(remote_docs.keys())

        to_push: List[DocumentVersion] = []
        to_fetch: List[DocumentVersion] = []
        in_sync: List[DocumentVersion] = []

        # Documents this node has that the remote doesn't
        for doc_id in local_ids - remote_ids:
            to_push.append(DocumentVersion(id=doc_id, version=local_docs[doc_id]))

        # Documents the remote has that this node doesn't
        for doc_id in remote_ids - local_ids:
            to_fetch.append(DocumentVersion(id=doc_id, version=remote_docs[doc_id]))

        # Documents both have, but need to check versions
        common_docs = local_ids.intersection(remote_ids)
        for doc_id in common_docs:
            local_version = local_docs[doc_id]
            remote_version = remote_docs[doc_id]
            if local_version > remote_version:
                to_push.append(DocumentVersion(id=doc_id, version=local_version))
            elif remote_version > local_version:
                to_fetch.append(DocumentVersion(id=doc_id, version=remote_version))
            else:
                in_sync.append(DocumentVersion(id=doc_id, version=local_version))

        return SyncPlan(
            node_id=remote_manifest_request.node_id,
            documents_to_download=to_fetch,
            documents_to_upload=to_push,
        )

    async def execute_sync_plan(self, peer_url: str, plan: SyncPlan):
        """Executes a sync plan by fetching documents from a peer."""
        if not plan.documents_to_download:
            logger.info(f"No documents to fetch from {peer_url}. Sync complete.")
            return

        logger.info(f"Executing sync plan for peer {peer_url}. Fetching {len(plan.documents_to_download)} documents.")
        api_client = ApiClient(base_url=peer_url)
        try:
            for doc_version in plan.documents_to_download:
                logger.info(f"Fetching document {doc_version.id} (version {doc_version.version}) from {peer_url}...")
                doc_data = await api_client.get_document(doc_version.id)
                if doc_data:
                    # Assuming the fetched data matches the Document model structure
                    document = Document(**doc_data)
                    dummy.save_document(document)
                    logger.info(f"Successfully fetched and saved document {document.id}.")
                else:
                    logger.warning(f"Failed to fetch document {doc_version.id} from {peer_url}.")
        finally:
            await api_client.close()
