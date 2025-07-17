from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


# Base schema for DocumentVersion
class DocumentVersionBase(BaseModel):
    version_number: int
    version_hash: str
    size_bytes: int
    mime_type: str
    created_by: Optional[str] = None


# Schema for responses
class DocumentVersionResponse(DocumentVersionBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Base schema for Document
class DocumentBase(BaseModel):
    title: str
    description: Optional[str] = None
    mime_type: str
    file_extension: Optional[str] = None
    metadata_: Optional[Dict[str, Any]] = None


# Schema for creating a document (not directly used in API, but good practice)
class DocumentCreate(DocumentBase):
    created_by: Optional[str] = None


# Schema for updating a document's metadata
class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    metadata_: Optional[Dict[str, Any]] = None


# Schema for document responses
class DocumentResponse(DocumentBase):
    id: int
    size_bytes: int
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    current_version: Optional[DocumentVersionResponse] = None

    model_config = ConfigDict(from_attributes=True)
