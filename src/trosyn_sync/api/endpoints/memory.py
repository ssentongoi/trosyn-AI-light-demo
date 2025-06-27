"""
Memory API endpoints for managing user memory.
"""
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from pathlib import Path
import json
import uuid

from ...memory import MemoryEngine, utils
from ...config import settings

router = APIRouter(
    prefix="/api/v1/memory",
    tags=["memory"],
    responses={404: {"description": "Not found"}},
)

def get_memory_engine(user_id: str) -> MemoryEngine:
    """Dependency to get a memory engine instance for the current user."""
    # In a real application, you would get the user ID from the auth token
    # For now, we'll use a placeholder
    return MemoryEngine(
        user_id=user_id,
        storage_path=settings.MEMORY_STORAGE_PATH,
        encryption_key=settings.MEMORY_ENCRYPTION_KEY
    )

@router.get("/context", response_model=Dict[str, Any])
async def get_context(
    user_id: str = "current_user",  # Replace with actual user from auth
    memory: MemoryEngine = Depends(get_memory_engine)
) -> Dict[str, Any]:
    """Get the current memory context for the user."""
    return memory.get_context_summary()

@router.post("/context")
async def update_context(
    context_updates: Dict[str, Any],
    user_id: str = "current_user",  # Replace with actual user from auth
    memory: MemoryEngine = Depends(get_memory_engine)
) -> Dict[str, str]:
    """Update the user's memory context."""
    memory.update_context(context_updates)
    return {"status": "context_updated"}

@router.post("/interaction")
async def add_interaction(
    query: str,
    response: str,
    metadata: Optional[Dict[str, Any]] = None,
    user_id: str = "current_user",  # Replace with actual user from auth
    memory: MemoryEngine = Depends(get_memory_engine)
) -> Dict[str, str]:
    """Record a new interaction with the AI."""
    interaction_id = memory.add_interaction(
        query=query,
        response=response,
        metadata=metadata or {}
    )
    return {"interaction_id": interaction_id, "status": "interaction_recorded"}

@router.get("/export")
async def export_memory(
    user_id: str = "current_user",  # Replace with actual user from auth
    memory: MemoryEngine = Depends(get_memory_engine)
) -> FileResponse:
    """Export the user's memory to a file."""
    export_path = Path(f"memory_export_{user_id}_{uuid.uuid4().hex[:8]}.json")
    try:
        memory.export_memory(export_path)
        return FileResponse(
            export_path,
            media_type="application/json",
            filename=f"trosyn_memory_{user_id}.json"
        )
    finally:
        if export_path.exists():
            export_path.unlink()

@router.post("/import")
async def import_memory(
    file: UploadFile = File(...),
    user_id: str = "current_user",  # Replace with actual user from auth
) -> Dict[str, str]:
    """Import memory from a file."""
    import_path = Path(f"memory_import_{user_id}_{uuid.uuid4().hex[:8]}.json")
    try:
        # Save uploaded file
        with open(import_path, "wb") as f:
            f.write(await file.read())
        
        # Validate the file
        if not utils.validate_memory_file(
            import_path,
            encryption_key=settings.MEMORY_ENCRYPTION_KEY
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid memory file format"
            )
        
        # Import the memory
        memory = MemoryEngine.import_memory(
            user_id=user_id,
            import_path=import_path,
            encryption_key=settings.MEMORY_ENCRYPTION_KEY
        )
        
        return {"status": "memory_imported"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to import memory: {str(e)}"
        )
    finally:
        if import_path.exists():
            import_path.unlink()

@router.delete("/clear")
async def clear_memory(
    user_id: str = "current_user",  # Replace with actual user from auth
    memory: MemoryEngine = Depends(get_memory_engine)
) -> Dict[str, str]:
    """Clear the user's memory."""
    # Clear all memory
    memory.memory = memory._get_default_memory()
    memory._save_memory()
    return {"status": "memory_cleared"}
