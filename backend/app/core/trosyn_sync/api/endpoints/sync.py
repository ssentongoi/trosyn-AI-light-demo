"""
Sync API endpoints for document synchronization between nodes.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from ...core.auth import TokenData, get_auth_service
from ...core.discovery import NodeInfo

router = APIRouter(prefix="/api/v1/sync", tags=["sync"])


class ConflictResolutionStrategy(str, Enum):
    """Available conflict resolution strategies."""

    LOCAL_WINS = "local_wins"
    REMOTE_WINS = "remote_wins"
    NEWER_WINS = "newer_wins"
    MERGE = "merge"
    DUPLICATE = "duplicate"


class SyncRequest(BaseModel):
    """Request to initiate synchronization."""

    source_node_id: str = Field(..., description="ID of the node initiating sync")
    source_api_url: str = Field(..., description="Base URL of the source node's API")
    last_sync_time: Optional[datetime] = Field(
        None, description="Last successful sync timestamp (ISO 8601)"
    )
    document_filter: Optional[dict] = Field(
        None, description="Filter criteria for documents to sync"
    )
    conflict_resolution_strategy: Optional[ConflictResolutionStrategy] = Field(
        ConflictResolutionStrategy.NEWER_WINS,
        description="Strategy to use for resolving conflicts",
    )
    force: bool = Field(False, description="Force sync even if no changes are detected")


class SyncStatus(BaseModel):
    """Synchronization status response."""

    sync_id: str = Field(..., description="Unique sync operation ID")
    status: str = Field(
        ..., description="Current status (pending, in_progress, completed, failed)"
    )
    status_url: str = Field(..., description="URL to check sync status")
    progress: Optional[float] = Field(
        None, description="Sync progress (0-100)", ge=0, le=100
    )
    estimated_time_remaining: Optional[int] = Field(
        None, description="Estimated time remaining in seconds", ge=0
    )


class DocumentManifestItem(BaseModel):
    """Item in the document manifest."""

    document_id: str
    version_hash: str
    updated_at: datetime
    size: int
    mime_type: str


class DocumentManifest(BaseModel):
    """Manifest of available documents."""

    node_id: str
    documents: List[DocumentManifestItem]
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class SyncResponse(SyncStatus):
    """Extended sync response with conflict resolution details."""

    conflicts_resolved: Optional[int] = Field(
        None, description="Number of conflicts resolved during sync"
    )
    resolution_details: Optional[List[Dict[str, Any]]] = Field(
        None, description="Details about resolved conflicts"
    )


@router.post(
    "/request",
    response_model=SyncResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Request synchronization with another node",
)
async def request_sync(
    request: SyncRequest,
    current_user: TokenData = Depends(get_auth_service().verify_token),
) -> SyncResponse:
    """
    Initiate a synchronization request with another node.

    This endpoint is called by a node to request synchronization with another node.
    The actual sync happens asynchronously.

    Args:
        request: Sync request details including source node and conflict resolution strategy
        current_user: Authenticated user making the request

    Returns:
        SyncResponse with status and conflict resolution details
    """
    from ...db.session import get_db
    from ...models import Node, get_node_by_id
    from ...services.sync_engine import SyncEngine

    db = next(get_db())

    try:
        # Get the local node
        local_node = get_node_by_id(db, request.source_node_id)
        if not local_node:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Node {request.source_node_id} not found",
            )

        # Create sync engine instance
        sync_engine = SyncEngine(
            db=db, local_node=local_node, http_client=None  # Will be created as needed
        )

        # Start the sync process
        sync_result = await sync_engine.sync_with_node(
            remote_node_id=request.source_node_id,
            conflict_strategy=request.conflict_resolution_strategy,
            force=request.force,
        )

        # Return sync status with conflict resolution details
        return SyncResponse(
            sync_id=f"sync_{int(datetime.utcnow().timestamp())}",
            status="in_progress",
            status_url=f"/api/v1/sync/status/sync_{int(datetime.utcnow().timestamp())}",
            progress=0,
            estimated_time_remaining=30,
            conflicts_resolved=len(sync_result.get("conflicts_resolved", [])),
            resolution_details=sync_result.get("conflicts_resolved"),
        )

    except Exception as e:
        logger.error(f"Error during sync request: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate sync: {str(e)}",
        )


@router.get(
    "/status/{sync_id}", response_model=SyncResponse, summary="Check sync status"
)
async def get_sync_status(
    sync_id: str, current_user: TokenData = Depends(get_auth_service().verify_token)
) -> SyncResponse:
    """
    Get the status of a sync operation.

    Args:
        sync_id: The ID of the sync operation
        current_user: Authenticated user making the request

    Returns:
        SyncResponse with current status, progress, and conflict resolution details
    """
    from ...db.session import get_db
    from ...models import SyncSession

    db = next(get_db())

    try:
        # Get sync session from database
        sync_session = db.query(SyncSession).filter(SyncSession.id == sync_id).first()

        if not sync_session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sync session {sync_id} not found",
            )

        # Convert to response model
        return SyncResponse(
            sync_id=sync_session.id,
            status=sync_session.status,
            status_url=f"/api/v1/sync/status/{sync_session.id}",
            progress=sync_session.progress,
            estimated_time_remaining=sync_session.estimated_time_remaining,
            conflicts_resolved=sync_session.conflicts_resolved,
            resolution_details=sync_session.resolution_details,
        )

    except Exception as e:
        logger.error(f"Error getting sync status: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get sync status: {str(e)}",
        )


@router.get("/nodes", response_model=List[dict], summary="List discovered nodes")
async def list_nodes(
    current_user: TokenData = Depends(get_auth_service().verify_token),
) -> List[dict]:
    """
    List all discovered nodes on the network.
    """
    # TODO: Get actual discovered nodes from discovery service
    return [
        {
            "node_id": "node1",
            "node_type": "TROSYSN_ADMIN_HUB",
            "ip": "192.168.1.100",
            "port": 8000,
            "last_seen": datetime.utcnow().isoformat(),
        }
    ]


@router.get(
    "/documents/manifest",
    response_model=DocumentManifest,
    summary="Get document manifest",
)
async def get_document_manifest(
    current_user: TokenData = Depends(get_auth_service().verify_token),
) -> DocumentManifest:
    """
    Get a manifest of all available documents on this node.
    """
    # TODO: Generate actual document manifest
    return DocumentManifest(
        node_id=current_user.node_id, documents=[], generated_at=datetime.utcnow()
    )
