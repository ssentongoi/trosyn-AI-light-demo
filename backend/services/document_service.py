# Copied from legacy editor_api/services/document_service.py

"""
Service layer for document processing operations
Handles loading, processing, and summarizing documents
"""

from typing import Dict, Any, Optional
from datetime import datetime
from app.core.trosyn_sync.services.sync_engine import SyncEngine
from utils.text_processor import TextProcessor

class DocumentService:
    """
    Service for handling document operations
    """

    def __init__(self, db=None, node_id=None):
        self.sync_engine = SyncEngine(db=db, node_id=node_id) if db is not None else None
        self.text_processor = TextProcessor()

    def load_document(self, file_content: str, file_type: str) -> Dict[str, Any]:
        try:
            if not file_content:
                raise ValueError("File content cannot be empty")
            if file_type == 'txt':
                processed_content = self.text_processor.process_text(file_content)
            elif file_type == 'md':
                processed_content = self.text_processor.process_markdown(file_content)
            else:
                raise ValueError(f"Unsupported file type: {file_type}")
            metadata = {
                "file_type": file_type,
                "created_at": datetime.now().isoformat(),
                "word_count": len(processed_content.split()),
                "processed_length": len(processed_content)
            }
            return {
                "content": processed_content,
                "metadata": metadata,
                "status": "success"
            }
        except Exception as e:
            return {
                "error": str(e),
                "status": "error"
            }

    def summarize_text(self, text: str) -> Dict[str, Any]:
        try:
            summary = self.text_processor.generate_summary(text)
            return {
                "summary": summary,
                "status": "success"
            }
        except Exception as e:
            return {
                "error": str(e),
                "status": "error"
            }

    def redact_text(self, text: str, sensitive_terms: Optional[list] = None) -> Dict[str, Any]:
        try:
            redacted_text = self.text_processor.redact_sensitive_info(text, sensitive_terms)
            return {
                "redacted_text": redacted_text,
                "status": "success"
            }
        except Exception as e:
            return {
                "error": str(e),
                "status": "error"
            }

    def spellcheck_text(self, text: str) -> Dict[str, Any]:
        try:
            spellchecked = self.text_processor.spellcheck(text)
            return {
                "spellchecked_text": spellchecked,
                "status": "success"
            }
        except Exception as e:
            return {
                "error": str(e),
                "status": "error"
            }
