import asyncio
import json
import os
from pathlib import Path
from typing import List, Optional, Dict, Any

from .models import Document, ConflictInfo
from ..logging_config import logger
from ..config import settings

def _get_storage_path() -> Path:
    """Returns the path to the storage directory, creating it if necessary."""
    path_str = os.environ.get("STORAGE_PATH") or settings.STORAGE_PATH
    if not path_str:
        path_str = "/tmp/trosyn_sync_default_storage"
        logger.warning(f"STORAGE_PATH not set, using default: {path_str}")
    
    path = Path(path_str).expanduser().resolve()
    path.mkdir(parents=True, exist_ok=True)
    return path

async def get_document_manifest() -> List[Document]:
    """Returns a manifest of all documents from the file system."""
    storage_path = _get_storage_path()
    docs = []
    
    for f in storage_path.glob("*.json"):
        try:
            doc = await get_document_by_id(f.stem)
            if doc:
                # Create a minimal version for the manifest
                manifest_doc = Document(
                    id=doc.id,
                    version=doc.version,
                    content="",  # Don't include content in manifest
                    title=doc.title,
                    last_modified=doc.last_modified,
                    last_modified_by=doc.last_modified_by,
                    file_path=doc.file_path,
                    metadata=doc.metadata
                )
                docs.append(manifest_doc)
        except Exception as e:
            logger.warning(f"Could not process document {f.name}: {str(e)}")
    
    return docs

async def get_document_by_id(document_id: str) -> Optional[Document]:
    """Returns a single document by its ID from the file system."""
    storage_path = _get_storage_path()
    doc_path = storage_path / f"{document_id}.json"
    
    if not doc_path.exists():
        return None
    
    try:
        # Use async file operations in a thread pool
        loop = asyncio.get_running_loop()
        with open(doc_path, "r") as f:
            data = await loop.run_in_executor(None, f.read)
            return Document.model_validate_json(data)
    except Exception as e:
        logger.error(f"Error reading document {document_id}: {str(e)}")
        return None

async def save_document(document: Document) -> bool:
    """Saves a document to a file in the storage directory.
    
    Args:
        document: The document to save
        
    Returns:
        bool: True if the document was saved successfully, False otherwise
    """
    try:
        storage_path = _get_storage_path()
        doc_path = storage_path / f"{document.id}.json"
        
        # Ensure the document has required fields
        if not document.last_modified:
            document.last_modified = datetime.datetime.utcnow().isoformat()
        
        # Convert to JSON
        doc_json = document.model_dump_json(indent=2)
        
        # Use async file operations in a thread pool
        loop = asyncio.get_running_loop()
        
        # Write to a temporary file first
        temp_path = doc_path.with_suffix(".tmp")
        try:
            with open(temp_path, "w") as f:
                await loop.run_in_executor(None, f.write, doc_json)
            
            # Atomic rename
            temp_path.replace(doc_path)
            logger.info(f"Saved document {document.id} (v{document.version}) to {doc_path}")
            return True
            
        except Exception as e:
            # Clean up temp file if it exists
            if temp_path.exists():
                temp_path.unlink(missing_ok=True)
            raise
            
    except Exception as e:
        logger.error(f"Error saving document {getattr(document, 'id', 'unknown')}: {str(e)}")
        return False

async def delete_document(document_id: str) -> bool:
    """Deletes a document from the storage.
    
    Args:
        document_id: The ID of the document to delete
        
    Returns:
        bool: True if the document was deleted, False if it didn't exist
    """
    storage_path = _get_storage_path()
    doc_path = storage_path / f"{document_id}.json"
    
    if not doc_path.exists():
        return False
    
    try:
        doc_path.unlink()
        logger.info(f"Deleted document {document_id}")
        return True
    except Exception as e:
        logger.error(f"Error deleting document {document_id}: {str(e)}")
        return False
