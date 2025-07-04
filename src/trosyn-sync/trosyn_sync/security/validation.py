"""Input validation and sanitization utilities for the Trosyn Sync service."""
import re
from typing import Any, Dict, List, Optional, Union, TypeVar, Type
from uuid import UUID
from pathlib import Path
import html

from pydantic import BaseModel, Field, field_validator, model_validator
from pydantic_core.core_schema import FieldValidationInfo

from ..config import settings

T = TypeVar('T', bound=BaseModel)

class SanitizationError(ValueError):
    """Raised when input fails sanitization checks."""
    pass

def sanitize_string(value: str, max_length: int = 255) -> str:
    """
    Sanitize a string by removing potentially dangerous characters and HTML.
    
    Args:
        value: The string to sanitize
        max_length: Maximum allowed length of the string
        
    Returns:
        Sanitized string with HTML escaped and length limited
        
    Raises:
        SanitizationError: If the string is too long or contains invalid characters
    """
    if not isinstance(value, str):
        raise SanitizationError("Input must be a string")
        
    # Remove null bytes
    value = value.replace('\x00', '')
    
    # Check length
    if len(value) > max_length:
        raise SanitizationError(f"String exceeds maximum length of {max_length} characters")
    
    # Escape HTML to prevent XSS
    sanitized = html.escape(value)
    
    # Additional security checks
    if re.search(r'[\x00-\x1F\x7F-\x9F]', value):
        raise SanitizationError("String contains invalid control characters")
        
    return sanitized

def validate_node_id(node_id: str) -> str:
    """
    Validate a node ID.
    
    Args:
        node_id: The node ID to validate
        
    Returns:
        The validated node ID
        
    Raises:
        SanitizationError: If the node ID is invalid
    """
    if not node_id or not isinstance(node_id, str):
        raise SanitizationError("Node ID must be a non-empty string")
        
    # Node ID format: node_<hex>
    if not re.match(r'^node_[a-f0-9]{16}$', node_id):
        raise SanitizationError("Invalid node ID format")
        
    return node_id

def validate_document_id(doc_id: str) -> str:
    """
    Validate a document ID (UUID).
    
    Args:
        doc_id: The document ID to validate
        
    Returns:
        The validated document ID
        
    Raises:
        SanitizationError: If the document ID is invalid
    """
    try:
        # This will raise ValueError if not a valid UUID
        UUID(doc_id)
        return doc_id
    except (ValueError, TypeError) as e:
        raise SanitizationError("Invalid document ID format") from e

def sanitize_path(filepath: Union[str, Path]) -> Path:
    """
    Sanitize a file path to prevent directory traversal attacks.
    
    Args:
        filepath: The path to sanitize
        
    Returns:
        A Path object with the sanitized path
        
    Raises:
        SanitizationError: If the path is invalid or attempts directory traversal
    """
    try:
        path = Path(filepath).resolve()
        
        # Check for directory traversal attempts
        if '..' in path.parts:
            raise SanitizationError("Path contains directory traversal attempts")
            
        # Check if path is within the data directory
        data_dir = settings.DATA_DIR.resolve()
        if not path.is_relative_to(data_dir):
            raise SanitizationError("Path is outside the allowed directory")
            
        return path
    except (ValueError, RuntimeError) as e:
        raise SanitizationError(f"Invalid path: {str(e)}") from e

class BaseRequestModel(BaseModel):
    """Base model for all API request models with common validation."""
    
    @model_validator(mode='before')
    @classmethod
    def validate_all_strings(cls, data: Any) -> Any:
        """Recursively validate and sanitize all string fields."""
        if isinstance(data, dict):
            return {
                key: cls._sanitize_field(key, value, cls.model_fields.get(key))
                for key, value in data.items()
            }
        return data
    
    @classmethod
    def _sanitize_field(cls, field_name: str, value: Any, field_info: Any) -> Any:
        """Sanitize a single field based on its type and validation rules."""
        if value is None:
            return None
            
        # Handle strings
        if isinstance(value, str):
            max_length = getattr(field_info, 'max_length', 255)
            try:
                return sanitize_string(value, max_length)
            except SanitizationError as e:
                raise ValueError(f"Invalid {field_name}: {str(e)}")
                
        # Handle lists of strings
        if isinstance(value, list):
            return [
                cls._sanitize_field(field_name, item, field_info)
                for item in value
            ]
            
        # Handle nested models
        if hasattr(value, 'model_dump'):
            return value.model_dump()
            
        return value

class DocumentRequest(BaseRequestModel):
    """Request model for document operations."""
    document_id: str
    content: str = Field(..., max_length=settings.MAX_UPLOAD_SIZE)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    @field_validator('document_id')
    @classmethod
    def validate_document_id(cls, v: str) -> str:
        try:
            return validate_document_id(v)
        except SanitizationError as e:
            raise ValueError(str(e))
    
    @field_validator('content')
    @classmethod
    def validate_content(cls, v: str) -> str:
        if not v:
            raise ValueError("Content cannot be empty")
        if len(v) > settings.MAX_UPLOAD_SIZE:
            raise ValueError(f"Content exceeds maximum size of {settings.MAX_UPLOAD_SIZE} bytes")
        return v

class SyncRequestModel(BaseRequestModel):
    """Request model for sync operations."""
    node_id: str
    document_manifest: Dict[str, str]  # doc_id -> hash
    
    @field_validator('node_id')
    @classmethod
    def validate_node_id(cls, v: str) -> str:
        try:
            return validate_node_id(v)
        except SanitizationError as e:
            raise ValueError(str(e))
    
    @field_validator('document_manifest')
    @classmethod
    def validate_manifest(cls, v: Dict[str, str]) -> Dict[str, str]:
        if not v:
            raise ValueError("Document manifest cannot be empty")
            
        # Limit the number of documents in a single sync request
        max_docs = getattr(settings, 'MAX_DOCS_PER_SYNC', 100)
        if len(v) > max_docs:
            raise ValueError(f"Too many documents in sync request (max {max_docs})")
            
        # Validate each document ID and hash
        validated = {}
        for doc_id, doc_hash in v.items():
            try:
                doc_id = validate_document_id(doc_id)
                if not re.match(r'^[a-f0-9]{64}$', doc_hash):
                    raise ValueError(f"Invalid hash for document {doc_id}")
                validated[doc_id] = doc_hash
            except (ValueError, SanitizationError) as e:
                raise ValueError(f"Invalid document entry: {str(e)}")
                
        return validated

def validate_request(model: Type[T], data: Dict[str, Any]) -> T:
    """
    Validate and sanitize request data against a model.
    
    Args:
        model: The Pydantic model to validate against
        data: The input data to validate
        
    Returns:
        An instance of the model with validated and sanitized data
        
    Raises:
        ValueError: If validation fails
    """
    try:
        return model.model_validate(data)
    except Exception as e:
        raise ValueError(f"Validation error: {str(e)}")

def sanitize_for_logging(data: Any) -> str:
    """
    Sanitize data for safe logging (prevents log injection).
    
    Args:
        data: The data to sanitize
        
    Returns:
        A string representation of the data with newlines and control characters removed
    """
    if data is None:
        return ""
        
    if isinstance(data, (dict, list)):
        import json
        try:
            data = json.dumps(data, ensure_ascii=False)
        except (TypeError, ValueError):
            data = str(data)
    else:
        data = str(data)
    
    # Remove control characters and limit length
    data = re.sub(r'[\x00-\x1F\x7F-\x9F]', '', data)
    return data[:1000]  # Limit log message length
