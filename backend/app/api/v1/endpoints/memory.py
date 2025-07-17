from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_active_user
from app.database import get_db
from app.models.user import User
from app.schemas.memory import (
    MemoryContextCreate,
    MemoryContextInDB,
    MemoryContextUpdate,
    MemoryInteractionCreate,
    MemoryInteractionInDB,
    MemoryInteractionUpdate,
    MemorySessionCreate,
    MemorySessionInDB,
    MemorySessionUpdate,
    MemoryStats,
)
from app.services.memory_service import MemoryService

router = APIRouter()


# Memory Interactions endpoints
@router.post(
    "/interactions",
    response_model=MemoryInteractionInDB,
    status_code=status.HTTP_201_CREATED,
)
async def create_memory_interaction(
    interaction: MemoryInteractionCreate,
    session_id: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new memory interaction.
    """
    return await MemoryService.create_interaction(
        db=db, user_id=current_user.id, interaction=interaction, session_id=session_id
    )


@router.get("/interactions/{interaction_id}", response_model=MemoryInteractionInDB)
async def get_memory_interaction(
    interaction_id: str = Path(..., title="The ID of the memory interaction to get"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific memory interaction by ID.
    """
    interaction = await MemoryService.get_interaction(
        db=db, interaction_id=interaction_id
    )

    if not interaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Memory interaction not found"
        )

    # Check if user has access to this interaction
    if interaction.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this memory interaction",
        )

    return interaction


@router.get("/interactions", response_model=List[MemoryInteractionInDB])
async def get_user_memory_interactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    session_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
    search_query: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    include_private: bool = True,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all memory interactions for the current user with filtering options.
    """
    return await MemoryService.get_user_interactions(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        session_id=session_id,
        conversation_id=conversation_id,
        search_query=search_query,
        start_date=start_date,
        end_date=end_date,
        include_private=include_private,
    )


@router.put("/interactions/{interaction_id}", response_model=MemoryInteractionInDB)
async def update_memory_interaction(
    interaction_id: str = Path(..., title="The ID of the memory interaction to update"),
    update_data: MemoryInteractionUpdate = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a memory interaction.
    """
    # First check if interaction exists and belongs to user
    interaction = await MemoryService.get_interaction(
        db=db, interaction_id=interaction_id
    )

    if not interaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Memory interaction not found"
        )

    if interaction.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this memory interaction",
        )

    updated_interaction = await MemoryService.update_interaction(
        db=db, interaction_id=interaction_id, update_data=update_data
    )

    return updated_interaction


@router.delete("/interactions/{interaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memory_interaction(
    interaction_id: str = Path(..., title="The ID of the memory interaction to delete"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a memory interaction.
    """
    # First check if interaction exists and belongs to user
    interaction = await MemoryService.get_interaction(
        db=db, interaction_id=interaction_id
    )

    if not interaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Memory interaction not found"
        )

    if interaction.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this memory interaction",
        )

    success = await MemoryService.delete_interaction(
        db=db, interaction_id=interaction_id
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete memory interaction",
        )


# Memory Context endpoints
@router.post(
    "/contexts", response_model=MemoryContextInDB, status_code=status.HTTP_201_CREATED
)
async def create_memory_context(
    context: MemoryContextCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new memory context.
    """
    return await MemoryService.create_context(
        db=db, user_id=current_user.id, context=context
    )


@router.get("/contexts/{context_id}", response_model=MemoryContextInDB)
async def get_memory_context(
    context_id: str = Path(..., title="The ID of the memory context to get"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific memory context by ID.
    """
    context = await MemoryService.get_context(db=db, context_id=context_id)

    if not context:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Memory context not found"
        )

    # Check if user has access to this context
    if context.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this memory context",
        )

    return context


@router.get("/contexts", response_model=List[MemoryContextInDB])
async def get_user_memory_contexts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search_query: Optional[str] = None,
    include_private: bool = True,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all memory contexts for the current user with filtering options.
    """
    return await MemoryService.get_user_contexts(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        search_query=search_query,
        include_private=include_private,
    )


@router.put("/contexts/{context_id}", response_model=MemoryContextInDB)
async def update_memory_context(
    context_id: str = Path(..., title="The ID of the memory context to update"),
    update_data: MemoryContextUpdate = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a memory context.
    """
    # First check if context exists and belongs to user
    context = await MemoryService.get_context(db=db, context_id=context_id)

    if not context:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Memory context not found"
        )

    if context.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this memory context",
        )

    updated_context = await MemoryService.update_context(
        db=db, context_id=context_id, update_data=update_data
    )

    return updated_context


@router.delete("/contexts/{context_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memory_context(
    context_id: str = Path(..., title="The ID of the memory context to delete"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a memory context.
    """
    # First check if context exists and belongs to user
    context = await MemoryService.get_context(db=db, context_id=context_id)

    if not context:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Memory context not found"
        )

    if context.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this memory context",
        )

    success = await MemoryService.delete_context(db=db, context_id=context_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete memory context",
        )


# Memory Session endpoints
@router.post(
    "/sessions", response_model=MemorySessionInDB, status_code=status.HTTP_201_CREATED
)
async def create_memory_session(
    session: MemorySessionCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new memory session.
    """
    return await MemoryService.create_session(
        db=db, user_id=current_user.id, session=session
    )


@router.get("/sessions/{session_id}", response_model=MemorySessionInDB)
async def get_memory_session(
    session_id: str = Path(..., title="The ID of the memory session to get"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific memory session by ID.
    """
    session = await MemoryService.get_session(db=db, session_id=session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Memory session not found"
        )

    # Check if user has access to this session
    if session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this memory session",
        )

    return session


@router.get("/sessions", response_model=List[MemorySessionInDB])
async def get_user_memory_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    active_only: bool = False,
    search_query: Optional[str] = None,
    tag_filter: Optional[List[str]] = Query(None),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all memory sessions for the current user with filtering options.
    """
    return await MemoryService.get_user_sessions(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        active_only=active_only,
        search_query=search_query,
        tag_filter=tag_filter,
        start_date=start_date,
        end_date=end_date,
    )


@router.put("/sessions/{session_id}", response_model=MemorySessionInDB)
async def update_memory_session(
    session_id: str = Path(..., title="The ID of the memory session to update"),
    update_data: MemorySessionUpdate = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a memory session.
    """
    # First check if session exists and belongs to user
    session = await MemoryService.get_session(db=db, session_id=session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Memory session not found"
        )

    if session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this memory session",
        )

    updated_session = await MemoryService.update_session(
        db=db, session_id=session_id, update_data=update_data
    )

    return updated_session


@router.put("/sessions/{session_id}/end", response_model=MemorySessionInDB)
async def end_memory_session(
    session_id: str = Path(..., title="The ID of the memory session to end"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    End a memory session (set is_active to False and ended_at to current time).
    """
    # First check if session exists and belongs to user
    session = await MemoryService.get_session(db=db, session_id=session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Memory session not found"
        )

    if session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to end this memory session",
        )

    ended_session = await MemoryService.end_session(db=db, session_id=session_id)

    return ended_session


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memory_session(
    session_id: str = Path(..., title="The ID of the memory session to delete"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a memory session.
    """
    # First check if session exists and belongs to user
    session = await MemoryService.get_session(db=db, session_id=session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Memory session not found"
        )

    if session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this memory session",
        )

    success = await MemoryService.delete_session(db=db, session_id=session_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete memory session",
        )


# Memory Statistics endpoint
@router.get("/stats", response_model=MemoryStats)
async def get_memory_statistics(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get memory usage statistics for the current user.
    """
    return await MemoryService.get_memory_stats(db=db, user_id=current_user.id)
