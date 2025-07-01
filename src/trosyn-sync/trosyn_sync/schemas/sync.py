from typing import List
from pydantic import BaseModel


class DocumentVersion(BaseModel):
    """Represents the version of a single document."""
    id: str
    version: int


class SyncRequest(BaseModel):
    """Request body for a sync operation from a peer."""
    node_id: str
    manifest: List[DocumentVersion]


class SyncPlan(BaseModel):
    """Represents the plan of action for a synchronization."""
    node_id: str
    documents_to_upload: List[DocumentVersion]
    documents_to_download: List[DocumentVersion]
