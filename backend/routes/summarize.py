from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from services.document_service import DocumentService

router = APIRouter()
doc_service = DocumentService()


class SummarizeRequest(BaseModel):
    text: str


class SummarizeResponse(BaseModel):
    summary: Optional[str] = None
    status: str
    error: Optional[str] = None


@router.post("/summarize", response_model=SummarizeResponse)
def summarize_text(request: SummarizeRequest):
    """
    Summarize the provided text.
    """
    return doc_service.summarize_text(request.text)
