"""
Document storage and versioning service.
"""

import hashlib
import logging
import os
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, BinaryIO, Dict, Optional, Tuple

from sqlalchemy.orm import Session

from ..db import get_db
from ..models.document import Document, DocumentVersion
from ..models.node import Node

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
        owner_node_id: int,
        metadata: Optional[Dict[str, Any]] = None,
        created_by: Optional[str] = None,
    ) -> Tuple[Document, DocumentVersion]:
        """Store a new document with its initial version."""
        file_hash = self._calculate_hash(file_obj)
        file_size = file_obj.tell()
        file_obj.seek(0)

        existing_version = DocumentVersion.get_by_hash(db, file_hash)
        if existing_version:
            doc = Document(
                owner_node_id=owner_node_id,
                title=filename,
                mime_type=mime_type,
                file_extension=Path(filename).suffix.lower(),
                size_bytes=file_size,
                metadata_=metadata,
                current_version_id=existing_version.id,
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
            logger.info(
                f"New document '{doc.id}' created, reusing existing content from version '{existing_version.id}'."
            )
            return doc, existing_version
        else:
            # Create document record
            doc = Document(
                owner_node_id=owner_node_id,
                title=filename,
                mime_type=mime_type,
                file_extension=Path(filename).suffix.lower(),
                size_bytes=file_size,
                metadata_=metadata,
            )
            db.add(doc)
            db.flush()

            # Save file to a temporary location first
            temp_dir = self.storage_root / "tmp" / str(uuid.uuid4())
            temp_dir.mkdir(parents=True, exist_ok=True)
            temp_storage_path = temp_dir / "content.bin"
            with open(temp_storage_path, "wb") as f:
                shutil.copyfileobj(file_obj, f)

            # Create version record with temporary path
            version = DocumentVersion(
                document_id=doc.id,
                version_number=1,
                version_hash=file_hash,
                size_bytes=file_size,
                storage_path=str(temp_storage_path),
                mime_type=mime_type,
                created_by=created_by,
            )
            db.add(version)
            db.flush()  # Get the version ID

            # Move file to permanent location and update path
            final_version_dir = self._get_version_path(version.id)
            final_storage_path = final_version_dir / "content.bin"
            final_version_dir.mkdir(parents=True, exist_ok=True)
            shutil.move(str(temp_storage_path), str(final_storage_path))
            shutil.rmtree(temp_dir)

            version.storage_path = str(final_storage_path)
            doc.current_version_id = version.id

            db.commit()
            db.refresh(doc)
            db.refresh(version)

            return doc, version

    def create_version(
        self,
        db: Session,
        document_id: int,
        file_obj: BinaryIO,
        filename: str,
        mime_type: str,
        created_by: Optional[str] = None,
    ) -> DocumentVersion:
        """Create a new version of an existing document."""
        doc = Document.get_by_id(db, document_id)
        if not doc:
            raise ValueError(
                f"Document {document_id} not found, cannot create version."
            )

        file_hash = self._calculate_hash(file_obj)
        file_size = file_obj.tell()
        file_obj.seek(0)

        # Check if this exact content already exists for this document
        existing_version = (
            db.query(DocumentVersion)
            .filter_by(document_id=document_id, version_hash=file_hash)
            .first()
        )
        if existing_version:
            logger.info(
                f"Returning existing version {existing_version.id} for document {document_id}"
            )
            return existing_version

        latest_version = doc.current_version
        version_number = (latest_version.version_number + 1) if latest_version else 1

        # Use the version ID for the storage path to avoid filename issues
        temp_version_id = (
            db.query(DocumentVersion).count() + 1
        )  # A temporary unique name
        version_storage_dir = self._get_version_path(temp_version_id)
        version_storage_dir.mkdir(parents=True, exist_ok=True)
        storage_path = version_storage_dir / "content.bin"

        with open(storage_path, "wb") as f:
            shutil.copyfileobj(file_obj, f)

        version = DocumentVersion(
            document_id=document_id,
            version_number=version_number,
            version_hash=file_hash,
            size_bytes=file_size,
            storage_path=str(storage_path),
            mime_type=mime_type,
            created_by=created_by,
        )
        db.add(version)
        db.flush()  # Flush to get the version ID

        # Correct the path with the final version ID
        final_storage_dir = self._get_version_path(version.id)
        if version_storage_dir != final_storage_dir:
            shutil.move(str(version_storage_dir), str(final_storage_dir))
            version.storage_path = str(final_storage_dir / "content.bin")

        doc.current_version_id = version.id
        doc.updated_at = datetime.utcnow()
        doc.size_bytes = file_size
        db.add(doc)
        db.add(version)
        db.commit()

        return version

    def get_document_file(
        self, db: Session, document_id: int, version_id: Optional[int] = None
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
                raise ValueError(
                    f"Version {version_id} not found for document {document_id}"
                )
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
        self, db: Session, document_id: int, permanent: bool = False
    ) -> None:
        """Delete a document and all its versions."""
        doc = Document.get_by_id(db, document_id)
        if not doc:
            logger.warning(f"Attempted to delete non-existent document {document_id}")
            return

        if permanent:
            # Break the FK cycle before deletion
            doc.current_version_id = None
            db.flush()

            # Delete physical files for all versions
            for version in doc.versions:
                version_dir = self._get_version_path(version.id)
                if version_dir.exists():
                    try:
                        shutil.rmtree(version_dir)
                        logger.debug(f"Deleted version directory: {version_dir}")
                    except OSError as e:
                        logger.error(f"Error deleting directory {version_dir}: {e}")

            # SQLAlchemy will handle deleting versions via cascade from the document relationship
            db.delete(doc)
            logger.info(f"Permanently deleted document {document_id} and its versions.")
        else:
            # Soft delete
            doc.is_deleted = True
            doc.deleted_at = datetime.utcnow()
            logger.info(f"Soft-deleted document {document_id}")

        db.commit()


# Singleton instance
storage_service = StorageService()
