"""Tests for department requests API endpoints."""
import pytest
from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient

from app.models.department_request import RequestStatus, RequestPriority, RequestType

# Test data
TEST_REQUEST_DATA = {
    "title": "New Test Request",
    "description": "This is a test request",
    "status": RequestStatus.DRAFT,
    "priority": RequestPriority.MEDIUM,
    "request_type": RequestType.EQUIPMENT,
    "due_date": "2023-12-31T23:59:59",
    "estimated_cost": 10000  # $100.00 in cents
}

# Test creating a new department request
@pytest.mark.asyncio
async def test_create_department_request(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_user,
    test_department,
    test_auth_headers
):
    """Test creating a new department request."""
    # Ensure all async fixtures are awaited
    user = await test_user if hasattr(test_user, '__await__') else test_user
    department = await test_department if hasattr(test_department, '__await__') else test_department
    headers = await test_auth_headers if hasattr(test_auth_headers, '__await__') else test_auth_headers
    
    # Get the async client
    client = await async_client if hasattr(async_client, '__await__') else async_client
    
    request_data = {
        "title": "New Department Request",
        "description": "This is a test department request",
        "status": "draft",
        "priority": "medium",
        "type": "other",
        "department_id": str(department.id)
    }
    
    response = await client.post(
        "/api/v1/department-requests/",
        json=request_data,
        headers=headers
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == request_data["title"]
    assert data["description"] == request_data["description"]
    assert data["status"] == request_data["status"]
    assert data["priority"] == request_data["priority"]
    assert data["type"] == request_data["type"]
    assert data["department_id"] == str(department.id)
    assert data["requester_id"] == str(user.id)

# Test getting a department request
@pytest.mark.asyncio
async def test_get_department_request(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_department_request,
    test_auth_headers
):
    """Test retrieving a department request."""
    # Ensure all async fixtures are awaited
    request = await test_department_request if hasattr(test_department_request, '__await__') else test_department_request
    headers = await test_auth_headers if hasattr(test_auth_headers, '__await__') else test_auth_headers
    
    # Get the async client
    client = await async_client if hasattr(async_client, '__await__') else async_client
    
    response = await client.get(
        f"/api/v1/department-requests/{request.id}",
        headers=headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(request.id)
    assert data["title"] == request.title
    assert data["description"] == request.description

# Test listing department requests
@pytest.mark.asyncio
async def test_list_department_requests(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_department_request,
    test_auth_headers
):
    """Test listing department requests."""
    # Ensure all async fixtures are awaited
    request = await test_department_request if hasattr(test_department_request, '__await__') else test_department_request
    headers = await test_auth_headers if hasattr(test_auth_headers, '__await__') else test_auth_headers
    
    # Get the async client
    client = await async_client if hasattr(async_client, '__await__') else async_client
    
    response = await client.get(
        "/api/v1/department-requests/",
        headers=headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert any(req["id"] == str(request.id) for req in data)

# Test updating a department request
@pytest.mark.asyncio
async def test_update_department_request(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_department_request,
    test_auth_headers
):
    """Test updating a department request."""
    # Ensure all async fixtures are awaited
    request = await test_department_request if hasattr(test_department_request, '__await__') else test_department_request
    headers = await test_auth_headers if hasattr(test_auth_headers, '__await__') else test_auth_headers
    
    # Get the async client
    client = await async_client if hasattr(async_client, '__await__') else async_client
    
    update_data = {
        "title": "Updated Department Request",
        "description": "This is an updated test department request",
        "status": "in_progress"
    }
    
    response = await client.put(
        f"/api/v1/department-requests/{request.id}",
        json=update_data,
        headers=headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == update_data["title"]
    assert data["description"] == update_data["description"]
    assert data["status"] == update_data["status"]

# Test deleting a department request
@pytest.mark.asyncio
async def test_delete_department_request(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_department_request,
    test_auth_headers
):
    """Test deleting a department request."""
    # Ensure all async fixtures are awaited
    request = await test_department_request if hasattr(test_department_request, '__await__') else test_department_request
    headers = await test_auth_headers if hasattr(test_auth_headers, '__await__') else test_auth_headers
    
    # Get the async client
    client = await async_client if hasattr(async_client, '__await__') else async_client
    
    # First, get the request to ensure it exists
    response = await client.get(
        f"/api/v1/department-requests/{request.id}",
        headers=headers
    )
    assert response.status_code == 200
    
    # Delete the request
    response = await client.delete(
        f"/api/v1/department-requests/{request.id}",
        headers=headers
    )
    assert response.status_code == 200
    
    # Verify the request is deleted
    response = await client.get(
        f"/api/v1/department-requests/{request.id}",
        headers=headers
    )
    assert response.status_code == 404

# Test request status transitions
@pytest.mark.asyncio
async def test_request_status_transitions(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_department_request,
    test_auth_headers
):
    """Test department request status transitions."""
    # Ensure all async fixtures are awaited
    request = await test_department_request if hasattr(test_department_request, '__await__') else test_department_request
    headers = await test_auth_headers if hasattr(test_auth_headers, '__await__') else test_auth_headers
    
    # Get the async client
    client = await async_client if hasattr(async_client, '__await__') else async_client
    
    # Test draft -> in_progress
    response = await client.patch(
        f"/api/v1/department-requests/{request.id}/status",
        json={"status": "in_progress"},
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "in_progress"
    
    # Test in_progress -> in_review
    response = await client.patch(
        f"/api/v1/department-requests/{request.id}/status",
        json={"status": "in_review"},
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "in_review"
    
    # Test in_review -> completed
    response = await client.patch(
        f"/api/v1/department-requests/{request.id}/status",
        json={"status": "completed"},
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "completed"

# Test adding a comment to a request
@pytest.mark.asyncio
async def test_add_comment_to_request(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_department_request,
    test_auth_headers
):
    """Test adding a comment to a department request."""
    # Ensure all async fixtures are awaited
    request = await test_department_request if hasattr(test_department_request, '__await__') else test_department_request
    auth_headers = await test_auth_headers if hasattr(test_auth_headers, '__await__') else test_auth_headers
    
    # Prepare comment data
    comment_data = {
        "content": "This is a test comment",
        "is_internal": False
    }

    # Make request to add comment
    response = await async_client.post(
        f"/api/v1/requests/{request.id}/comments",
        json=comment_data,
        headers=auth_headers
    )

    # Assert response
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["content"] == comment_data["content"]
    assert data["is_internal"] == comment_data["is_internal"]
    assert "id" in data
    assert "created_at" in data
