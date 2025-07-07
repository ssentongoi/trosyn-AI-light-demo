"""
Permission checking utilities for Trosyn AI.

This module provides functions for checking user permissions
related to departments, requests, and other resources.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException
from typing import Optional, Union, List

from ..models.user import User
from ..models.department import Department
from ..models.department_request import DepartmentRequest

async def check_department_access(user_id: int, department_id: int, db: Optional[AsyncSession] = None) -> bool:
    """
    Check if a user has access to a department.
    
    Args:
        user_id: The ID of the user
        department_id: The ID of the department
        db: Optional database session
        
    Returns:
        True if user has access, False otherwise
    
    Raises:
        HTTPException: If user doesn't have access to the department
    """
    # In a real implementation, this would query the database
    # to check if the user belongs to the department or has admin rights
    
    # For now, we'll assume access is granted
    # This should be replaced with actual permission logic
    return True

async def check_request_permissions(
    user: User, 
    request: DepartmentRequest, 
    action: str = "read"
) -> bool:
    """
    Check if a user has permissions to perform an action on a request.
    
    Args:
        user: The user object
        request: The department request object
        action: The action to check ("read", "update", "delete", etc.)
        
    Returns:
        True if user has permission, False otherwise
        
    Raises:
        HTTPException: If user doesn't have permission for the action
    """
    # Superusers can do anything
    if user.is_superuser:
        return True
        
    # Department admins can manage requests in their department
    if user.is_admin and user.department_id == request.department_id:
        return True
        
    # Requesters can manage their own requests
    if request.requester_id == user.id:
        return True
        
    # Approvers can manage requests they're assigned to
    if request.approver_id == user.id:
        return True
        
    # If we get here, user doesn't have permission
    if action == "read":
        error_msg = "You don't have permission to view this request"
    elif action == "update":
        error_msg = "You don't have permission to update this request"
    elif action == "delete":
        error_msg = "You don't have permission to delete this request"
    else:
        error_msg = f"You don't have permission to {action} this request"
        
    raise HTTPException(status_code=403, detail=error_msg)
