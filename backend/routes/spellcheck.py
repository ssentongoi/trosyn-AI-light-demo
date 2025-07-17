from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from services.document_service import DocumentService

router = APIRouter()
doc_service = DocumentService()


class SpellcheckRequest(BaseModel):
    text: str


class SpellcheckResponse(BaseModel):
    spellchecked_text: Optional[str] = None
    status: str
    error: Optional[str] = None


@router.post("/spellcheck", response_model=SpellcheckResponse)
def spellcheck_text(request: SpellcheckRequest):
    """
    Spellcheck the provided text.
    """
    return doc_service.spellcheck_text(request.text)
