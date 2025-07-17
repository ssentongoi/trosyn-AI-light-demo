"""Test data utilities for department requests."""

from datetime import datetime, timedelta
from typing import Any, Dict
from uuid import uuid4


def create_test_company_data(**overrides) -> Dict[str, Any]:
    """Create test company data with optional overrides."""
    data = {
        "name": f"Test Company {uuid4().hex[:8]}",
        "description": "A test company",
        "is_active": True,
    }
    data.update(overrides)
    return data


def create_test_department_data(company_id: int, **overrides) -> Dict[str, Any]:
    """Create test department data with optional overrides."""
    data = {
        "name": f"Test Department {uuid4().hex[:4]}",
        "description": "A test department",
        "company_id": company_id,
        "is_active": True,
    }
    data.update(overrides)
    return data


def create_test_user_data(department_id: int, **overrides) -> Dict[str, Any]:
    """Create test user data with optional overrides."""
    email = f"user_{uuid4().hex[:8]}@example.com"
    data = {
        "email": email,
        "full_name": f"Test User {uuid4().hex[:4]}",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password = "testpass"
        "is_active": True,
        "is_superuser": False,
        "department_id": department_id,
    }
    data.update(overrides)
    return data


def create_test_department_request_data(
    requester_id: int, department_id: int, approver_id: int, **overrides
) -> Dict[str, Any]:
    """Create test department request data with optional overrides."""
    data = {
        "title": f"Test Request {uuid4().hex[:4]}",
        "description": "This is a test request",
        "status": "draft",
        "priority": "medium",
        "request_type": "equipment",
        "requester_id": requester_id,
        "department_id": department_id,
        "approver_id": approver_id,
        "due_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
        "estimated_cost": 10000,  # $100.00 in cents
    }
    data.update(overrides)
    return data


def create_test_comment_data(
    request_id: int, user_id: int, **overrides
) -> Dict[str, Any]:
    """Create test comment data with optional overrides."""
    data = {
        "content": f"Test comment {uuid4().hex[:4]}",
        "is_internal": False,
        "request_id": request_id,
        "user_id": user_id,
    }
    data.update(overrides)
    return data
