from typing import Any, Dict

from fastapi import APIRouter
from pydantic import BaseModel

from services.document_service import DocumentService

router = APIRouter()
doc_service = DocumentService()


class UploadRequest(BaseModel):
    file_content: str
    file_type: str


class UploadResponse(BaseModel):
    content: str = None
    metadata: Dict[str, Any] = None
    status: str
    error: str = None


@router.post("/upload", response_model=UploadResponse)
def upload_document(request: UploadRequest):
    """
    Upload and process a document file.
    """
    result = doc_service.load_document(request.file_content, request.file_type)
    return result
