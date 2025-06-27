from datetime import datetime
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field, HttpUrl
from enum import Enum
from pydantic import validator

class ChunkType(str, Enum):
    """Types of document chunks."""
    TEXT = "text"
    TITLE = "title"
    HEADING = "heading"
    PARAGRAPH = "paragraph"
    LIST_ITEM = "list_item"
    TABLE = "table"
    IMAGE = "image"
    FOOTNOTE = "footnote"
    CAPTION = "caption"
    CODE = "code"
    QUOTE = "quote"

class DocumentMetadata(BaseModel):
    """Metadata for a processed document."""
    filename: str = Field(..., description="Original filename of the document")
    file_type: str = Field(..., description="MIME type of the document")
    file_size: int = Field(..., description="Size of the document in bytes")
    file_extension: Optional[str] = Field(None, description="File extension")
    page_count: Optional[int] = Field(None, description="Number of pages in the document")
    language: Optional[str] = Field(None, description="Detected language of the document")
    source_url: Optional[HttpUrl] = Field(None, description="Source URL if document was downloaded")
    created_at: Optional[datetime] = Field(None, description="Document creation timestamp")
    modified_at: Optional[datetime] = Field(None, description="Document last modified timestamp")
    processed_at: datetime = Field(default_factory=datetime.utcnow, description="When the document was processed")
    chunk_type: Optional[str] = Field(None, description="Type of chunk (title, paragraph, etc.)")
    element_id: Optional[str] = Field(None, description="Unique ID of the element in the document")
    page_number: Optional[int] = Field(None, description="Page number where the content appears")
    section: Optional[str] = Field(None, description="Document section this chunk belongs to")
    author: Optional[str] = Field(None, description="Document author")
    title: Optional[str] = Field(None, description="Document title")
    keywords: List[str] = Field(default_factory=list, description="Document keywords")
    extra: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

class DocumentChunk(BaseModel):
    """A chunk of text from a processed document with metadata and embedding support."""
    id: Optional[str] = Field(None, description="Unique identifier for the chunk in the vector store")
    text: str = Field(..., description="The actual text content of the chunk")
    type: Union[ChunkType, str] = Field(
        ChunkType.TEXT, 
        description="Type of the chunk (e.g., paragraph, heading, etc.)"
    )
    embedding: Optional[List[float]] = Field(
        None, 
        description="Vector embedding of the text (if available)"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata about the chunk"
    )
    
    @validator('type', pre=True)
    def validate_chunk_type(cls, v):
        if isinstance(v, ChunkType):
            return v
        try:
            return ChunkType(v.lower())
        except ValueError:
            return ChunkType.TEXT

class DocumentProcessResponse(BaseModel):
    """Response model for document processing."""
    filename: str = Field(..., description="Original filename of the processed document")
    file_type: str = Field(..., description="MIME type of the document")
    chunk_count: int = Field(..., description="Total number of chunks generated")
    document_ids: List[str] = Field(
        default_factory=list,
        description="List of document IDs in the vector store (if added)"
    )
    chunks: List[DocumentChunk] = Field(
        default_factory=list,
        description="List of document chunks (may be truncated in the response)"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata about the processing"
    )
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class DocumentFilter(BaseModel):
    """Filter criteria for document search."""
    field: str = Field(..., description="Field to filter on")
    operator: str = Field("==", description="Comparison operator (==, !=, >, <, >=, <=, in, not_in, contains)")
    value: Any = Field(..., description="Value to compare against")
    
    class Config:
        schema_extra = {
            "example": {
                "field": "metadata.chunk_type",
                "operator": "==",
                "value": "heading"
            }
        }

class DocumentSearchRequest(BaseModel):
    """Request model for searching documents."""
    query: str = Field(..., description="Search query string")
    filters: Optional[List[DocumentFilter]] = Field(
        None, 
        description="Optional filters to apply to the search"
    )
    limit: int = Field(
        5, 
        ge=1, 
        le=100, 
        description="Maximum number of results to return"
    )
    min_score: float = Field(
        0.5, 
        ge=0.0, 
        le=1.0, 
        description="Minimum relevance score (0.0 to 1.0)"
    )
    include_embeddings: bool = Field(
        False, 
        description="Whether to include vector embeddings in the response"
    )
    
    class Config:
        schema_extra = {
            "example": {
                "query": "machine learning algorithms",
                "filters": [{"field": "metadata.chunk_type", "operator": "==", "value": "paragraph"}],
                "limit": 5,
                "min_score": 0.6
            }
        }

class DocumentSearchResult(BaseModel):
    """A search result from a document search."""
    id: str = Field(..., description="Unique identifier of the chunk in the vector store")
    text: str = Field(..., description="The text content of the matching chunk")
    score: float = Field(..., ge=0.0, le=1.0, description="Relevance score (0.0 to 1.0)")
    document_id: Optional[str] = Field(None, description="Parent document ID if available")
    metadata: Dict[str, Any] = Field(
        default_factory=dict, 
        description="Metadata associated with the chunk"
    )
    
    class Config:
        schema_extra = {
            "example": {
                "id": "chunk-123",
                "text": "Machine learning is a method of data analysis...",
                "score": 0.87,
                "document_id": "doc-456",
                "metadata": {
                    "chunk_type": "paragraph",
                    "page_number": 5,
                    "section": "Introduction"
                }
            }
        }

class DocumentSearchResponse(BaseModel):
    """Response model for document search results."""
    query: str = Field(..., description="The original search query")
    results: List[DocumentSearchResult] = Field(
        default_factory=list,
        description="List of matching document chunks"
    )
    total_results: int = Field(
        0,
        ge=0,
        description="Total number of matching results"
    )
    processing_time_ms: float = Field(
        0.0,
        ge=0.0,
        description="Time taken to process the search query in milliseconds"
    )
    
    class Config:
        schema_extra = {
            "example": {
                "query": "machine learning algorithms",
                "results": [
                    {
                        "id": "chunk-123",
                        "text": "Machine learning is a method of data analysis...",
                        "score": 0.87,
                        "metadata": {"chunk_type": "paragraph", "page_number": 5}
                    }
                ],
                "total_results": 1,
                "processing_time_ms": 123.45
            }
        }
