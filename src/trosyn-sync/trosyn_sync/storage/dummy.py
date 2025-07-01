import os
import json
from pathlib import Path
from typing import List, Optional

from .models import Document
from ..logging_config import logger

def _get_storage_path() -> Path:
    path_str = os.environ.get("STORAGE_PATH")
    if not path_str:
        logger.warning("STORAGE_PATH not set, using a default temporary directory.")
        path_str = "/tmp/trosyn_sync_default_storage"
    path = Path(path_str)
    path.mkdir(parents=True, exist_ok=True)
    return path

def get_document_manifest() -> List[Document]:
    """Returns a manifest of all documents from the file system."""
    storage_path = _get_storage_path()
    docs = []
    for f in storage_path.glob("*.json"):
        with open(f, "r") as doc_file:
            try:
                docs.append(Document.parse_raw(doc_file.read()))
            except json.JSONDecodeError:
                logger.warning(f"Could not parse document {f.name}")
    return docs

def get_document_by_id(document_id: str) -> Optional[Document]:
    """Returns a single document by its ID from the file system."""
    storage_path = _get_storage_path()
    doc_path = storage_path / f"{document_id}.json"
    if not doc_path.exists():
        return None
    with open(doc_path, "r") as f:
        return Document.parse_raw(f.read())

def save_document(document: Document):
    """Saves a document to a file in the storage directory."""
    storage_path = _get_storage_path()
    doc_path = storage_path / f"{document.id}.json"
    with open(doc_path, "w") as f:
        f.write(document.json())
    logger.info(f"Saved document {document.id} to {doc_path}")

