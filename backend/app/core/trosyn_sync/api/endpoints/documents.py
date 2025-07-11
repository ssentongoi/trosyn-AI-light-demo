"""
Document synchronization API endpoints.
"""
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse, JSONResponse, Response
from sqlalchemy.orm import Session

from ...core.auth import get_current_user, TokenData
from ...db import get_db
from ...models.document import Document, DocumentVersion, DocumentSyncStatus
from ...models.node import Node, SyncQueue
from ...services.storage import storage_service
from ...services.sync_engine import SyncEngine
from ...schemas.document import DocumentCreate, DocumentUpdate, DocumentResponse, DocumentVersionResponse

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])
logger = logging.getLogger(__name__)

# Dependency to get the current node ID
@router.post("/", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Upload a new document."""
    try:
        if not current_user or not current_user.node_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not identify the node from the provided token."
            )

        node = db.query(Node).filter(Node.node_id == current_user.node_id).first()
        if not node:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Owner node with ID '{current_user.node_id}' not found."
            )

        doc, _ = storage_service.store_document(
            db,
            file.file,
            file.filename,
            file.content_type,
            owner_node_id=node.id,
            created_by=current_user.node_id
        )
        return doc
    except Exception as e:
        logger.error(f"Error creating document: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create document"
        )

def get_current_node_id() -> str:
    """Get the current node ID from environment or configuration."""
    return os.getenv("NODE_ID", "local-node")

@router.get("/", response_model=List[DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """List all documents."""
    return db.query(Document).filter(Document.is_deleted == False).all()

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Get a single document."""
    doc = db.get(Document, document_id)
    if not doc or doc.is_deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Download the current version of a document."""
    doc = db.get(Document, document_id)
    if not doc or doc.is_deleted:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        file_path, mime_type = storage_service.get_document_file(db, document_id=doc.id)
    except (ValueError, FileNotFoundError) as e:
        logger.error(f"Could not retrieve file for document {document_id}: {e}")
        raise HTTPException(status_code=404, detail="Document file not found")
        
    return FileResponse(path=file_path, filename=doc.title, media_type=mime_type)

@router.put("/{document_id}", response_model=DocumentResponse)
def update_document(
    document_id: int,
    update_data: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Update a document's metadata."""
    doc = db.get(Document, document_id)
    if not doc or doc.is_deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    
    update_data_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_data_dict.items():
        setattr(doc, key, value)
        
    db.commit()
    db.refresh(doc)
    return doc

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Soft-delete a document."""
    doc = db.get(Document, document_id)
    if not doc or doc.is_deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc.is_deleted = True
    doc.deleted_at = datetime.utcnow()
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.post("/{document_id}/restore", response_model=DocumentResponse)
def restore_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Restore a soft-deleted document."""
    doc = db.get(Document, document_id)
    if not doc or not doc.is_deleted:
        raise HTTPException(status_code=404, detail="Document not found or not deleted")
        
    doc.is_deleted = False
    doc.deleted_at = None
    db.commit()
    db.refresh(doc)
    return doc

@router.get("/{document_id}/versions", response_model=List[DocumentVersionResponse])
def get_document_versions(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Get all versions of a document."""
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc.versions

@router.get("/manifest", response_model=Dict[str, Any])
async def get_document_manifest(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get a manifest of all documents on this node.
    
    This endpoint returns metadata about all documents that should be synchronized
    with other nodes.
    """
    # Get all non-deleted documents with their current versions
    docs = db.query(Document).options(
        joinedload(Document.current_version)
    ).filter(
        Document.is_deleted == False  # noqa
    ).all()
    
    return {
        "node_id": get_current_node_id(),
        "timestamp": datetime.utcnow().isoformat(),
        "documents": [
            {
                "document_id": str(doc.id),
                "version_id": str(doc.current_version.id) if doc.current_version else None,
                "version_hash": doc.current_version.version_hash if doc.current_version else None,
                "title": doc.title,
                "mime_type": doc.mime_type,
                "size_bytes": doc.size_bytes,
                "created_at": doc.created_at.isoformat(),
                "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
                "metadata": doc.metadata_ or {}
            }
            for doc in docs if doc.current_version
        ]
    }

@router.get("/{document_id}/versions/{version_id}")
async def get_document_version(
    document_id: str,
    version_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get metadata for a specific document version.
    
    This endpoint returns metadata about a specific version of a document
    without returning the actual file content.
    """
    try:
        doc = db.get(Document, document_id)
        if not doc or doc.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document {document_id} not found"
            )
        
        version = next(
            (v for v in doc.versions if str(v.id) == version_id),
            None
        )
        if not version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Version {version_id} not found for document {document_id}"
            )
        
        return {
            "document_id": str(doc.id),
            "version_id": str(version.id),
            "version_number": version.version_number,
            "version_hash": version.version_hash,
            "title": doc.title,
            "mime_type": version.mime_type,
            "size_bytes": version.size_bytes,
            "created_at": version.created_at.isoformat(),
            "is_encrypted": version.is_encrypted,
            "created_by": version.created_by,
            "metadata": doc.metadata_ or {}
        }
        
    except Exception as e:
        logger.error(f"Error getting document version: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{document_id}/versions/{version_id}/download")
async def download_document_version(
    document_id: str,
    version_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> FileResponse:
    """
    Download a specific version of a document.
    
    This endpoint returns the actual file content for a specific version
    of a document.
    """
    try:
        doc = db.get(Document, document_id)
        if not doc or doc.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document {document_id} not found"
            )
        
        version = next(
            (v for v in doc.versions if str(v.id) == version_id),
            None
        )
        if not version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Version {version_id} not found for document {document_id}"
            )
        
        file_path = Path(version.storage_path)
        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File not found at {file_path}"
            )
        
        return FileResponse(
            file_path,
            filename=f"{doc.title}{doc.file_extension or ''}",
            media_type=version.mime_type
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading document version: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_id: str = Query(..., description="Document ID"),
    version_id: str = Query(..., description="Version ID"),
    version_hash: str = Query(..., description="SHA-256 hash of the file content"),
    title: str = Query(..., description="Document title"),
    mime_type: str = Query(..., description="MIME type of the file"),
    metadata: str = Query("{}", description="JSON string of document metadata"),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Upload a new document or document version.
    
    This endpoint is used by other nodes to push document updates to this node.
    """
    try:
        # Parse metadata
        try:
            metadata_dict = json.loads(metadata)
        except json.JSONDecodeError:
            metadata_dict = {}
        
        # Check if this is a new document or an update
        doc = db.get(Document, document_id)
        
        # Determine owner node
        owner_node_str_id = owner_id if owner_id else current_user.node_id
        if not owner_node_str_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document owner ID must be provided either in the token or as a query parameter."
            )

        owner_node = db.query(Node).filter(Node.node_id == owner_node_str_id).first()
        if not owner_node:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Owner node with ID '{owner_node_str_id}' not found."
            )
        
        # Save the uploaded file to a temporary location
        temp_file = Path(f"storage/tmp/upload_{document_id}_{version_id}")
        temp_file.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            # Save the uploaded file
            with temp_file.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Verify the file hash
            with temp_file.open("rb") as f:
                file_hash = hashlib.sha256()
                while chunk := f.read(8192):
                    file_hash.update(chunk)
                
                if file_hash.hexdigest() != version_hash:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="File hash does not match the provided version hash"
                    )
            
            # Process the file
            with temp_file.open("rb") as f:
                if doc:
                    # Update existing document
                    doc, version = storage_service.create_version(
                        db,
                        document_id,
                        f,
                        title,
                        mime_type,
                        created_by=f"sync:{current_user.node_id}"
                    )
                else:
                    # Create new document
                    doc, version = storage_service.store_document(
                        db,
                        f,
                        title,
                        mime_type,
                        owner_node_id=owner_node.id,
                        metadata=metadata_dict,
                        created_by=f"sync:{current_user.node_id}"
                    )
                
                # Update document metadata
                doc.metadata_ = metadata_dict
                db.commit()
                
                return {
                    "document_id": str(doc.id),
                    "version_id": str(version.id),
                    "version_hash": version.version_hash,
                    "status": "created" if not doc else "updated"
                }
                
        finally:
            # Clean up temporary file
            if temp_file.exists():
                try:
                    temp_file.unlink()
                except Exception as e:
                    logger.warning(f"Failed to delete temporary file {temp_file}: {e}")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/{document_id}/sync")
async def sync_document(
    document_id: str,
    target_node_id: str = Query(..., description="ID of the node to sync with"),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Initiate synchronization of a specific document with another node.
    """
    try:
        # Get the document
        doc = db.get(Document, document_id)
        if not doc or doc.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document {document_id} not found"
            )
        
        # Get the target node
        target_node = db.query(Node).filter(Node.node_id == target_node_id).first()
        if not target_node or not target_node.is_online:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Target node {target_node_id} is not available"
            )
        
        # Create a sync queue entry
        queue_item = SyncQueue(
            document_id=doc.id,
            node_id=target_node.id,
            version_id=doc.current_version_id,
            status="pending",
            priority=5  # Medium priority
        )
        db.add(queue_item)
        db.commit()
        
        return {
            "status": "queued",
            "queue_id": queue_item.id,
            "document_id": str(doc.id),
            "target_node_id": target_node_id,
            "version_id": str(doc.current_version_id) if doc.current_version_id else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating document sync: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
