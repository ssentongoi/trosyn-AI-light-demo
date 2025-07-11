from typing import Any, List
from pydantic import BaseModel


class DocumentVersion(BaseModel):
    """Represents the version of a single document."""
    id: str
    version: int


class SyncRequest(BaseModel):
    """Request body for a sync operation from a peer.
    
    Attributes:
        node_id: The ID of the node making the request
        manifest: List of document versions in the node's manifest
        documents: Optional list of full document objects being synced
    """
    node_id: str
    manifest: List[DocumentVersion]
    documents: List[Any] = []  # List of full document objects


class SyncPlan(BaseModel):
    """Represents the plan of action for a synchronization."""
    node_id: str
    documents_to_upload: List[DocumentVersion]
    documents_to_download: List[DocumentVersion]
