from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
import os
import uuid

from .... import models, schemas
from ....core.security import get_current_active_user
from ....database import get_db
from ....models.user import User
from ....schemas.department_request import (
    DepartmentRequestCreate,
    DepartmentRequestUpdate,
    DepartmentRequest as DepartmentRequestSchema,
    DepartmentRequestListResponse,
    RequestCommentCreate,
    RequestAttachment as RequestAttachmentSchema,
    RequestStatus,
    RequestPriority,
    RequestType
)
from ....services.department_request import DepartmentRequestService, get_department_request_service

router = APIRouter()

# Helper function to check user permissions
def check_request_permission(
    request: models.DepartmentRequest,
    current_user: models.User,
    allow_admin: bool = True
) -> bool:
    """Check if user has permission to access/modify the request."""
    # Superadmins can do anything
    if current_user.is_superuser:
        return True
    
    # Department admins can manage requests in their department
    if allow_admin and current_user.department_id == request.department_id:
        # Check if user has admin role in the department
        # This assumes you have a way to check department admin status
        # You'll need to implement this based on your role/permission system
        pass
    
    # Requesters can manage their own requests
    if request.requester_id == current_user.id:
        return True
    
    # Approvers can manage requests they're assigned to
    if request.approver_id == current_user.id:
        return True
    
    return False

# Request endpoints
@router.post("/", response_model=DepartmentRequestSchema, status_code=status.HTTP_201_CREATED)
async def create_request(
    request_data: DepartmentRequestCreate,
    service: DepartmentRequestService = Depends(get_department_request_service),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new department request.
    """
    if not current_user.department_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to a department"
        )
    
    # The department_id is now part of the request_data schema
    # and is validated there. The service uses the ID from the validated schema.
    db_request = await service.create_request(
        request_data=request_data,
        user_id=current_user.id
    )
    
    return db_request

@router.get("/{request_id}", response_model=DepartmentRequestSchema)
async def get_request(
    request_id: int,
    service: DepartmentRequestService = Depends(get_department_request_service),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific request by ID.
    """
    try:
        db_request = await service.get_request(request_id=request_id)
        
        # Check permissions
        if not check_request_permission(db_request, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this request"
            )
        
        return db_request
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/", response_model=DepartmentRequestListResponse)
async def list_requests(
    skip: int = 0,
    limit: int = 100,
    status: Optional[RequestStatus] = None,
    priority: Optional[RequestPriority] = None,
    request_type: Optional[RequestType] = None,
    department_id: Optional[int] = None,
    my_requests: bool = False,
    service: DepartmentRequestService = Depends(get_department_request_service),
    current_user: User = Depends(get_current_active_user)
):
    """
    List all requests with optional filtering.
    """
    try:
        # If my_requests is True, only return requests created by the current user
        requester_id = current_user.id if my_requests else None
        
        # If not admin and not filtering by my_requests, only show requests from the user's department
        if not current_user.is_superuser and not my_requests:
            department_id = current_user.department_id
        
        # Get requests using the service
        requests = await service.get_requests(
            skip=skip,
            limit=limit,
            status=status,
            priority=priority,
            request_type=request_type,
            department_id=department_id,
            requester_id=requester_id
        )
        
        # Get total count for pagination (this is a simplified version)
        # In a real app, you might want to add a count method to the service
        total = len(requests)
        
        return {
            "data": requests,
            "total": total,
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit if limit > 0 else 1
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/{request_id}", response_model=DepartmentRequestSchema)
async def update_request(
    request_id: int,
    request_data: DepartmentRequestUpdate,
    service: DepartmentRequestService = Depends(get_department_request_service),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update a request.
    """
    try:
        # First get the request to check permissions
        db_request = await service.get_request(request_id=request_id)
        
        # Check permissions
        if not check_request_permission(db_request, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this request"
            )
        
        # The DepartmentRequestUpdate schema already controls which fields are updatable.
        # We can pass the request_data directly to the service.
        updated_request = await service.update_request(
            request_id=request_id,
            request_data=request_data,
            user_id=current_user.id
        )
        
        return updated_request
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_request(
    request_id: int,
    service: DepartmentRequestService = Depends(get_department_request_service),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a request.
    """
    try:
        # First get the request to check permissions
        db_request = await service.get_request(request_id=request_id)
        
        # Only the requester or an admin can delete a request
        if db_request.requester_id != current_user.id and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this request"
            )
        
        # Delete the request using the service
        await service.delete_request(
            request_id=request_id,
            user_id=current_user.id
        )
        
        return None
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# Status transition endpoints
@router.post("/{request_id}/submit", response_model=DepartmentRequestSchema)
async def submit_request(
    request_id: int,
    service: DepartmentRequestService = Depends(get_department_request_service),
    current_user: User = Depends(get_current_active_user)
):
    """
    Submit a draft request for review.
    """
    try:
        # Submit the request using the service
        db_request = await service.submit_request(
            request_id=request_id,
            user_id=current_user.id
        )
        return db_request
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/{request_id}/approve", response_model=DepartmentRequestSchema)
async def approve_request(
    request_id: int,
    service: DepartmentRequestService = Depends(get_department_request_service),
    current_user: User = Depends(get_current_active_user)
):
    """
    Approve a pending request.
    """
    try:
        # Approve the request using the service
        db_request = await service.approve_request(
            request_id=request_id,
            approver_id=current_user.id
        )
        return db_request
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/{request_id}/reject", response_model=DepartmentRequestSchema)
async def reject_request(
    request_id: int,
    reason: str = None,
    service: DepartmentRequestService = Depends(get_department_request_service),
    current_user: User = Depends(get_current_active_user)
):
    """
    Reject a pending request.
    """
    try:
        # Reject the request using the service
        db_request = await service.reject_request(
            request_id=request_id,
            user_id=current_user.id,
            reason=reason
        )
        return db_request
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/{request_id}/complete", response_model=DepartmentRequestSchema)
async def complete_request(
    request_id: int,
    service: DepartmentRequestService = Depends(get_department_request_service),
    current_user: User = Depends(get_current_active_user)
):
    """
    Mark an approved request as completed.
    """
    try:
        # Mark the request as completed using the service
        db_request = await service.complete_request(
            request_id=request_id,
            user_id=current_user.id
        )
        return db_request
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# Comment endpoints
@router.post("/{request_id}/comments", response_model=DepartmentRequestSchema)
async def add_comment(
    request_id: int,
    comment_data: RequestCommentCreate,
    service: DepartmentRequestService = Depends(get_department_request_service),
    current_user: User = Depends(get_current_active_user)
):
    """
    Add a comment to a request.
    """
    try:
        # Add the comment using the service
        db_comment = await service.add_comment(
            request_id=request_id,
            comment_data=comment_data,
            user_id=current_user.id
        )
        # Return the updated request with the new comment
        db_request = await service.get_request(request_id=request_id)
        return db_request
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# File upload endpoint
@router.post("/{request_id}/attachments", response_model=RequestAttachmentSchema, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    request_id: int,
    file: UploadFile = File(...),
    service: DepartmentRequestService = Depends(get_department_request_service),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload an attachment for a request.
    """
    try:
        db_attachment = await service.add_attachment(
            request_id=request_id,
            file_data=file,
            user_id=current_user.id
        )
        return db_attachment
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload attachment: {e}"
        )

# Register the router with the API router
# This should be done in your main FastAPI app file
