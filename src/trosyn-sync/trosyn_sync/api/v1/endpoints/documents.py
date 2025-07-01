from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import get_sync_token
from ....storage import dummy

router = APIRouter()


@router.get("/manifest", dependencies=[Depends(get_sync_token)])
async def get_document_manifest():
    """Returns a manifest of available documents."""
    manifest = dummy.get_document_manifest()
    return {"manifest": manifest}


@router.get("/{document_id}", dependencies=[Depends(get_sync_token)])
async def get_document(document_id: str):
    """Returns a specific document by its ID."""
    document = dummy.get_document_by_id(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document
