from fastapi import APIRouter, Depends, Request, HTTPException, status
from typing import Dict, Any

from ....auth.security import verify_token, check_rate_limit
from ....schemas.sync import SyncRequest, SyncPlan
from ....sync.engine import SyncEngine
from ....config import settings

router = APIRouter()
sync_engine = SyncEngine()

# Rate limiting configuration
SYNC_RATE_LIMIT = settings.RATE_LIMIT_REQUESTS
SYNC_WINDOW = settings.RATE_LIMIT_WINDOW


def get_client_identifier(request: Request) -> str:
    """Get a unique identifier for the client for rate limiting."""
    # Use X-Forwarded-For if behind a proxy, otherwise use client IP
    if "x-forwarded-for" in request.headers:
        return request.headers["x-forwarded-for"].split(",")[0]
    return request.client.host if request.client else "unknown"


@router.post(
    "/request",
    response_model=SyncPlan,
    responses={
        200: {"description": "Sync plan generated successfully"},
        401: {"description": "Unauthorized - Invalid or missing authentication"},
        403: {"description": "Forbidden - Node not authorized"},
        429: {"description": "Too Many Requests - Rate limit exceeded"},
    },
)
async def request_sync(
    sync_request: SyncRequest,
    request: Request,
    node_id: str = Depends(verify_token),
) -> Dict[str, Any]:
    """
    Analyzes a peer's manifest and returns a sync plan.
    
    This endpoint is rate limited to prevent abuse. Each client is allowed
    a limited number of requests per time window.
    
    Args:
        sync_request: The sync request containing the peer's document manifest
        
    Returns:
        SyncPlan: The sync plan with documents to upload/download
        
    Raises:
        HTTPException: If authentication fails or rate limit is exceeded
    """
    # Check rate limit
    client_id = get_client_identifier(request)
    rate_key = f"sync_request:{client_id}"
    
    if not check_rate_limit(request, rate_key, SYNC_RATE_LIMIT, SYNC_WINDOW):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many sync requests. Please try again later.",
            headers={
                "Retry-After": str(SYNC_WINDOW),
                "X-RateLimit-Limit": str(SYNC_RATE_LIMIT),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(SYNC_WINDOW),
            },
        )
    
    # Process sync request
    try:
        sync_plan = sync_engine.get_sync_plan(sync_request)
        return sync_plan
        
    except Exception as e:
        # Log the error but don't leak internal details to the client
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing the sync request",
        )
