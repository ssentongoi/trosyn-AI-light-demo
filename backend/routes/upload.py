from typing import Any, Dict, Optional
import os
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from pydantic import BaseModel

from services.document_service import DocumentService

router = APIRouter()
doc_service = DocumentService()


class UploadResponse(BaseModel):
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    status: str
    error: Optional[str] = None


@router.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload and process a document file.
    
    Args:
        file: The file to upload and process
        
    Returns:
        UploadResponse: The processed document content and metadata
    """
    try:
        # Get file extension from filename
        file_extension = os.path.splitext(file.filename or "")[1].lower().lstrip('.')
        if not file_extension:
            file_extension = "txt"  # Default to txt if no extension
            
        # Read file content
        content = await file.read()
        
        # Process the document
        result = doc_service.load_document(content.decode('utf-8'), file_extension)
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing file: {str(e)}"
        )
