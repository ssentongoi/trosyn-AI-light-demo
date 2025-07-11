from fastapi import APIRouter, Depends, HTTPException, Request, status
from typing import Dict, Any, List

from ....auth.security import verify_token, check_rate_limit
from ....storage import dummy
from ....config import settings

router = APIRouter()

# Rate limiting configuration
DOCUMENT_RATE_LIMIT = settings.RATE_LIMIT_REQUESTS
DOCUMENT_WINDOW = settings.RATE_LIMIT_WINDOW


def get_client_identifier(request: Request) -> str:
    """Get a unique identifier for the client for rate limiting."""
    if "x-forwarded-for" in request.headers:
        return request.headers["x-forwarded-for"].split(",")[0]
    return request.client.host if request.client else "unknown"


@router.get(
    "/manifest",
    response_model=Dict[str, List[Dict[str, Any]]],
    responses={
        200: {"description": "Document manifest retrieved successfully"},
        401: {"description": "Unauthorized - Invalid or missing authentication"},
        403: {"description": "Forbidden - Node not authorized"},
        429: {"description": "Too Many Requests - Rate limit exceeded"},
    },
)
async def get_document_manifest(
    request: Request,
    node_id: str = Depends(verify_token),
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Returns a manifest of available documents.
    
    This endpoint is rate limited to prevent abuse. Each client is allowed
    a limited number of requests per time window.
    
    Returns:
        Dict: A dictionary containing the document manifest
    """
    # Check rate limit
    client_id = get_client_identifier(request)
    rate_key = f"doc_manifest:{client_id}"
    
    if not check_rate_limit(request, rate_key, DOCUMENT_RATE_LIMIT, DOCUMENT_WINDOW):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
            headers={
                "Retry-After": str(DOCUMENT_WINDOW),
                "X-RateLimit-Limit": str(DOCUMENT_RATE_LIMIT),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(DOCUMENT_WINDOW),
            },
        )
    
    try:
        manifest = dummy.get_document_manifest()
        return {"manifest": manifest}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving the document manifest",
        )


@router.get(
    "/{document_id}",
    response_model=Dict[str, Any],
    responses={
        200: {"description": "Document retrieved successfully"},
        401: {"description": "Unauthorized - Invalid or missing authentication"},
        403: {"description": "Forbidden - Node not authorized"},
        404: {"description": "Not Found - Document not found"},
        429: {"description": "Too Many Requests - Rate limit exceeded"},
    },
)
async def get_document(
    document_id: str,
    request: Request,
    node_id: str = Depends(verify_token),
) -> Dict[str, Any]:
    """
    Returns a specific document by its ID.
    
    This endpoint is rate limited to prevent abuse. Each client is allowed
    a limited number of requests per time window.
    
    Args:
        document_id: The ID of the document to retrieve
        
    Returns:
        Dict: The requested document
        
    Raises:
        HTTPException: If the document is not found or rate limit is exceeded
    """
    # Check rate limit
    client_id = get_client_identifier(request)
    rate_key = f"doc_get:{client_id}:{document_id}"
    
    if not check_rate_limit(request, rate_key, DOCUMENT_RATE_LIMIT, DOCUMENT_WINDOW):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests for this document. Please try again later.",
            headers={
                "Retry-After": str(DOCUMENT_WINDOW),
                "X-RateLimit-Limit": str(DOCUMENT_RATE_LIMIT),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(DOCUMENT_WINDOW),
            },
        )
    
    try:
        document = dummy.get_document_by_id(document_id)
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found",
            )
        return document
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving the document",
        )
