"""
Document storage and versioning service.
"""
import hashlib
import logging
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import BinaryIO, Optional, Tuple, Dict, Any

from sqlalchemy.orm import Session

from ..models.document import Document, DocumentVersion
from ..models.node import Node
from ..db import get_db

logger = logging.getLogger(__name__)

class StorageService:
    """Handles document storage and versioning."""
    
    def __init__(self, storage_root: str = "storage"):
        """Initialize the storage service.
        
        Args:
            storage_root: Root directory for document storage
        """
        self.storage_root = Path(storage_root).resolve()
        self.storage_root.mkdir(parents=True, exist_ok=True)
        
        # Create required subdirectories
        (self.storage_root / "documents").mkdir(exist_ok=True)
        (self.storage_root / "versions").mkdir(exist_ok=True)
        (self.storage_root / "tmp").mkdir(exist_ok=True)
    
    def _get_document_path(self, doc_id: int) -> Path:
        """Get the storage path for a document."""
        return self.storage_root / "documents" / str(doc_id)
    
    def _get_version_path(self, version_id: int) -> Path:
        """Get the storage path for a document version."""
        return self.storage_root / "versions" / str(version_id)
    
    def _calculate_hash(self, file_obj: BinaryIO) -> str:
        """Calculate the SHA-256 hash of a file-like object."""
        file_obj.seek(0)
        sha256_hash = hashlib.sha256()
        
        # Read and update hash in chunks of 4K
        for byte_block in iter(lambda: file_obj.read(4096), b""):
            sha256_hash.update(byte_block)
            
        return sha256_hash.hexdigest()
    
    def store_document(
        self,
        db: Session,
        file_obj: BinaryIO,
        filename: str,
        mime_type: str,
        metadata: Optional[Dict[str, Any]] = None,
        created_by: Optional[str] = None
    ) -> Tuple[Document, DocumentVersion]:
        """Store a new document with its initial version.
        
        Args:
            db: Database session
            file_obj: File-like object containing the document data
            filename: Original filename
            mime_type: MIME type of the file
            metadata: Optional metadata dictionary
            created_by: Username or node ID that created this document
            
        Returns:
            Tuple of (document, document_version)
        """
        # Calculate file hash
        file_hash = self._calculate_hash(file_obj)
        file_size = file_obj.tell()
        file_obj.seek(0)
        
        # Check if this exact content already exists
        existing_version = DocumentVersion.get_by_hash(db, file_hash)
        if existing_version:
            # Reuse existing content
            storage_path = existing_version.storage_path
            file_obj.seek(0, 2)  # Seek to end to get size
        else:
            # Create a new document record
            doc = Document(
                title=filename,
                mime_type=mime_type,
                file_extension=Path(filename).suffix.lower(),
                size_bytes=file_size,
                metadata_=metadata
            )
            db.add(doc)
            db.flush()  # Get the document ID
            
            # Create storage directory
            doc_dir = self._get_document_path(doc.id)
            doc_dir.mkdir(exist_ok=True)
            
            # Save the file
            storage_path = doc_dir / filename
            with open(storage_path, 'wb') as f:
                shutil.copyfileobj(file_obj, f)
            
            # Create initial version
            version = DocumentVersion(
                document_id=doc.id,
                version_number=1,
                version_hash=file_hash,
                size_bytes=file_size,
                storage_path=str(storage_path),
                mime_type=mime_type,
                is_encrypted=False,
                created_by=created_by
            )
            db.add(version)
            db.flush()
            
            # Update document with current version
            doc.current_version_id = version.id
            
            db.commit()
            
            return doc, version
    
    def create_version(
        self,
        db: Session,
        document_id: int,
        file_obj: BinaryIO,
        filename: str,
        mime_type: str,
        created_by: Optional[str] = None
    ) -> DocumentVersion:
        """Create a new version of an existing document.
        
        Args:
            db: Database session
            document_id: ID of the document to update
            file_obj: File-like object containing the new version
            filename: Original filename
            mime_type: MIME type of the file
            created_by: Username or node ID that created this version
            
        Returns:
            The new document version
        """
        # Get the document
        doc = Document.get_by_id(db, document_id)
        if not doc:
            raise ValueError(f"Document {document_id} not found")
        
        # Calculate file hash
        file_hash = self._calculate_hash(file_obj)
        file_size = file_obj.tell()
        file_obj.seek(0)
        
        # Check if this exact content already exists as a version
        existing_version = DocumentVersion.get_by_hash(db, file_hash)
        if existing_version and existing_version.document_id == document_id:
            return existing_version
        
        # Get next version number
        latest_version = DocumentVersion.get_latest_version(db, document_id)
        version_number = latest_version.version_number + 1 if latest_version else 1
        
        # Create version directory
        doc_dir = self._get_document_path(document_id)
        version_path = doc_dir / f"v{version_number}"
        version_path.mkdir(exist_ok=True)
        
        # Save the file
        storage_path = version_path / filename
        with open(storage_path, 'wb') as f:
            shutil.copyfileobj(file_obj, f)
        
        # Create new version
        version = DocumentVersion(
            document_id=document_id,
            version_number=version_number,
            version_hash=file_hash,
            size_bytes=file_size,
            storage_path=str(storage_path),
            mime_type=mime_type,
            is_encrypted=False,
            created_by=created_by
        )
        db.add(version)
        db.flush()
        
        # Update document
        doc.current_version_id = version.id
        doc.updated_at = datetime.utcnow()
        doc.size_bytes = file_size
        
        db.commit()
        
        return version
    
    def get_document_file(
        self,
        db: Session,
        document_id: int,
        version_id: Optional[int] = None
    ) -> Tuple[Path, str]:
        """Get the file path and MIME type for a document.
        
        Args:
            db: Database session
            document_id: ID of the document
            version_id: Optional version ID (defaults to latest)
            
        Returns:
            Tuple of (file_path, mime_type)
        """
        if version_id:
            version = db.query(DocumentVersion).get(version_id)
            if not version or version.document_id != document_id:
                raise ValueError(f"Version {version_id} not found for document {document_id}")
        else:
            doc = Document.get_by_id(db, document_id)
            if not doc or not doc.current_version:
                raise ValueError(f"Document {document_id} not found or has no versions")
            version = doc.current_version
        
        file_path = Path(version.storage_path)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found at {file_path}")
            
        return file_path, version.mime_type
    
    def delete_document(
        self,
        db: Session,
        document_id: int,
        permanent: bool = False
    ) -> None:
        """Delete a document and all its versions.
        
        Args:
            db: Database session
            document_id: ID of the document to delete
            permanent: If True, permanently delete the document and files
        """
        doc = Document.get_by_id(db, document_id)
        if not doc:
            raise ValueError(f"Document {document_id} not found")
        
        if permanent:
            # Permanently delete the document and all versions
            doc_dir = self._get_document_path(document_id)
            if doc_dir.exists():
                shutil.rmtree(doc_dir)
            
            # Delete all versions
            for version in doc.versions:
                version_path = Path(version.storage_path)
                if version_path.exists():
                    try:
                        version_path.unlink()
                    except OSError as e:
                        logger.warning(f"Failed to delete version file {version_path}: {e}")
            
            db.delete(doc)
        else:
            # Soft delete
            doc.is_deleted = True
        
        db.commit()


# Singleton instance
storage_service = StorageService()
