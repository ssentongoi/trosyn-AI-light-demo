from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.exc import IntegrityError
import logging

from ..models.department_request import RequestStatus, RequestPriority, RequestType
from ..schemas.department_request import (
    DepartmentRequestCreate, DepartmentRequestUpdate, DepartmentRequestResponse
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import Depends

from ..database import get_db
from ..models.department_request import DepartmentRequest, RequestStatus
from ..core.security import get_current_active_user
from ..models.user import User
from ..core.permissions import check_department_access, check_request_permissions

logger = logging.getLogger(__name__)

# Department Request Service
class DepartmentRequestService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.model = DepartmentRequest
    
    async def create_request(self, request_in: DepartmentRequestCreate, requester_id: int) -> DepartmentRequest:
        """Create a new department request"""
        # Create the request object by explicitly mapping fields
        # to ensure enum members are passed correctly, not their string values.
        db_obj = self.model(
            title=request_in.title,
            description=request_in.description,
            request_type=request_in.request_type,
            priority=request_in.priority,
            due_date=request_in.due_date,
            estimated_cost=request_in.estimated_cost,
            custom_fields=request_in.custom_fields,
            department_id=request_in.department_id,
            requester_id=requester_id,
            status=RequestStatus.DRAFT  # Default status on creation
        )
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj
    
    async def get_request(self, request_id: int):
        """Get a department request by ID"""
        query = select(self.model).where(self.model.id == request_id)
        result = await self.db.execute(query)
        return result.scalars().first()
    
    async def get_requests(self, skip: int = 0, limit: int = 100, status=None, priority=None, 
                          request_type=None, department_id=None, requester_id=None, assignee_id=None):
        """Get department requests with optional filtering"""
        query = select(self.model)
        
        # Apply filters if provided
        if status:
            query = query.where(self.model.status == status)
        if priority:
            query = query.where(self.model.priority == priority)
        if request_type:
            query = query.where(self.model.request_type == request_type)
        if department_id:
            query = query.where(self.model.department_id == department_id)
        if requester_id:
            query = query.where(self.model.requester_id == requester_id)
        if assignee_id:
            query = query.where(self.model.approver_id == assignee_id)
            
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def update_request(self, request_id: int, request_in: DepartmentRequestUpdate, user_id: int):
        """Update a department request"""
        db_obj = await self.get_request(request_id)
        if not db_obj:
            return None
            
        # Update fields from request_in
        for field, value in request_in.dict(exclude_unset=True).items():
            setattr(db_obj, field, value)
            
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

# Dependency to get the service
async def get_department_request_service(db: AsyncSession = Depends(get_db)) -> DepartmentRequestService:
    return DepartmentRequestService(db)

router = APIRouter(
    prefix="/department-requests",
    tags=["department-requests"],
    responses={404: {"description": "Not found"}},
)

def log_and_raise(status_code: int, detail: str, exc: Exception = None):
    if exc:
        logger.exception(detail)
    raise HTTPException(status_code=status_code, detail=detail)

@router.post("/", response_model=DepartmentRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_department_request(
    request_data: DepartmentRequestCreate,
    current_user: User = Depends(get_current_active_user),
    service: DepartmentRequestService = Depends(get_department_request_service),
):
    try:
        if request_data.department_id:
            await check_department_access(current_user.id, request_data.department_id)
        return await service.create_request(request_data, current_user.id)
    except IntegrityError as e:
        log_and_raise(400, "Invalid data or duplicates", e)
    except HTTPException:
        raise
    except Exception as e:
        log_and_raise(500, "Internal error during request creation", e)

@router.get("/", response_model=List[DepartmentRequestResponse])
async def get_department_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[RequestStatus] = None,
    priority: Optional[RequestPriority] = None,
    request_type: Optional[RequestType] = None,
    department_id: Optional[int] = None,
    requester_id: Optional[int] = None,
    assignee_id: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    service: DepartmentRequestService = Depends(get_department_request_service),
):
    try:
        if not current_user.is_admin:
            requester_id = requester_id or current_user.id
            department_id = department_id or current_user.department_id
        return await service.get_requests(skip, limit, status, priority, request_type, department_id, requester_id, assignee_id)
    except Exception as e:
        log_and_raise(500, "Failed to retrieve requests", e)

@router.get("/{request_id}", response_model=DepartmentRequestResponse)
async def get_department_request(
    request_id: int,
    current_user: User = Depends(get_current_active_user),
    service: DepartmentRequestService = Depends(get_department_request_service),
):
    try:
        db_request = await service.get_request(request_id)
        if not db_request:
            raise HTTPException(status_code=404, detail="Request not found")
        await check_request_permissions(current_user, db_request, "read")
        return db_request
    except HTTPException:
        raise
    except Exception as e:
        log_and_raise(500, "Failed to retrieve request", e)

@router.put("/{request_id}", response_model=DepartmentRequestResponse)
async def update_department_request(
    request_id: int,
    request_data: DepartmentRequestUpdate,
    current_user: User = Depends(get_current_active_user),
    service: DepartmentRequestService = Depends(get_department_request_service),
):
    try:
        db_request = await service.get_request(request_id)
        if not db_request:
            raise HTTPException(status_code=404, detail="Request not found")
        await check_request_permissions(current_user, db_request, "update")
        return await service.update_request(request_id, request_data, current_user.id)
    except HTTPException:
        raise
    except IntegrityError as e:
        log_and_raise(400, "Invalid data or constraints", e)
    except Exception as e:
        log_and_raise(500, "Internal error during update", e)

@router.delete("/{request_id}", status_code=204)
async def delete_department_request(
    request_id: int,
    current_user: User = Depends(get_current_active_user),
    service: DepartmentRequestService = Depends(get_department_request_service),
):
    try:
        db_request = await service.get_request(request_id)
        if not db_request:
            raise HTTPException(status_code=404, detail="Request not found")
        await check_request_permissions(current_user, db_request, "delete")
        await service.delete_request(request_id, current_user.id)
    except HTTPException:
        raise
    except Exception as e:
        log_and_raise(500, "Deletion failed", e)

@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "department-requests"}
