"""
Test router implementation for Department Request API tests.

This module provides a simplified router for testing department request endpoints
with proper eager loading and error handling.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_current_user
from app.database import get_db
from app.models.department_request import DepartmentRequest
from app.models.user import User
from tests.test_schemas import (
    Status,
    TestDepartmentRequestCreate,
    TestDepartmentRequestResponse,
    TestDepartmentRequestResponseWrapper,
)

test_router = APIRouter()


@test_router.post(
    "/",
    response_model=TestDepartmentRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_department_request_test(
    request_data: TestDepartmentRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Test endpoint for creating department requests with simplified response model
    """
    try:
        # Create the department request
        dept_request = DepartmentRequest(
            title=request_data.title,
            description=request_data.description,
            request_type=request_data.request_type.value,
            priority=request_data.priority.value,
            department_id=request_data.department_id,
            requester_id=current_user.id,
            status=Status.DRAFT.value,
        )

        db.add(dept_request)
        await db.commit()

        # Refresh with eager loading to get all relationships
        stmt = (
            select(DepartmentRequest)
            .options(
                selectinload(DepartmentRequest.requester),
                selectinload(DepartmentRequest.department),
                selectinload(DepartmentRequest.approver),
            )
            .where(DepartmentRequest.id == dept_request.id)
        )

        result = await db.execute(stmt)
        dept_request = result.scalar_one()

        return dept_request

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating department request: {str(e)}",
        )


@test_router.get("/{request_id}", response_model=TestDepartmentRequestResponse)
async def get_department_request_test(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Test endpoint for retrieving department requests
    """
    stmt = (
        select(DepartmentRequest)
        .options(
            selectinload(DepartmentRequest.requester),
            selectinload(DepartmentRequest.department),
            selectinload(DepartmentRequest.approver),
        )
        .where(DepartmentRequest.id == request_id)
    )

    result = await db.execute(stmt)
    dept_request = result.scalar_one_or_none()

    if not dept_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Department request not found"
        )

    return dept_request
