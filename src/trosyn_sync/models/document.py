"""
Document and version models for the sync service.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, String, Text, Integer, ForeignKey, DateTime, Boolean, JSON
from sqlalchemy.orm import relationship, Session, Mapped, mapped_column
from sqlalchemy.sql import func
from pydantic import ConfigDict
from .base import Base, BaseMixin

class Document(Base, BaseMixin):
    """Represents a document in the system."""
    __tablename__ = "document"
    
    # Define columns with type annotations for SQLAlchemy 2.0
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_extension: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    current_version_id: Mapped[Optional[int]] = mapped_column(
        Integer, 
        ForeignKey('documentversion.id'), 
        nullable=True
    )
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    metadata_: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        'metadata', 
        JSON, 
        nullable=True
    )  # Custom metadata as JSON
    
    # Relationships
    versions: Mapped[List["DocumentVersion"]] = relationship(
        "DocumentVersion", 
        back_populates="document", 
        order_by="desc(DocumentVersion.version_number)",
        foreign_keys="DocumentVersion.document_id",
        cascade="all, delete-orphan",
        overlaps="current_version"
    )
    current_version: Mapped[Optional["DocumentVersion"]] = relationship(
        "DocumentVersion", 
        foreign_keys=[current_version_id],
        remote_side="DocumentVersion.id",
        post_update=True,
        viewonly=True,
        overlaps="versions"
    )
    
    # Pydantic v2 config
    model_config = ConfigDict(from_attributes=True)
    
    @property
    def latest_version(self) -> Optional['DocumentVersion']:
        """Get the latest version of this document."""
        if not self.versions:
            return None
        return self.versions[0]
    
    @classmethod
    def get_by_id(cls, db: Session, doc_id: int) -> Optional['Document']:
        """Get a document by ID."""
        return db.query(cls).filter(cls.id == doc_id).first()
    
    @classmethod
    def get_by_external_id(cls, db: Session, external_id: str) -> Optional['Document']:
        """Get a document by external ID."""
        return db.query(cls).filter(cls.external_id == external_id).first()


class DocumentVersion(Base, BaseMixin):
    """Represents a specific version of a document."""
    __tablename__ = "documentversion"
    
    # Define columns with type annotations for SQLAlchemy 2.0
    document_id: Mapped[int] = mapped_column(
        Integer, 
        ForeignKey('document.id'), 
        nullable=False, 
        index=True
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    version_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)  # SHA-256 hash of content
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)  # Path to the actual file
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    is_encrypted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    encryption_iv: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)  # IV for AES encryption if used
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # User/node that created this version
    
    # Relationships
    document: Mapped["Document"] = relationship(
        "Document", 
        back_populates="versions",
        foreign_keys=[document_id],
        overlaps="current_version"
    )
    
    # Table arguments
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )
    
    # Pydantic v2 config
    model_config = ConfigDict(from_attributes=True)
    
    @classmethod
    def get_latest_version(cls, db: Session, document_id: int) -> Optional['DocumentVersion']:
        """Get the latest version of a document."""
        return (
            db.query(cls)
            .filter(cls.document_id == document_id)
            .order_by(cls.version_number.desc())
            .first()
        )
    
    @classmethod
    def get_by_hash(cls, db: Session, doc_hash: str) -> Optional['DocumentVersion']:
        """Get a document version by its content hash."""
        return db.query(cls).filter(cls.version_hash == doc_hash).first()


class DocumentSyncStatus(Base, BaseMixin):
    """Tracks sync status of documents across nodes."""
    __tablename__ = "documentsyncstatus"
    
    # Define columns with type annotations for SQLAlchemy 2.0
    document_id: Mapped[int] = mapped_column(
        Integer, 
        ForeignKey('document.id'), 
        nullable=False, 
        index=True
    )
    node_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)  # ID of the node
    version_id: Mapped[Optional[int]] = mapped_column(
        Integer, 
        ForeignKey('documentversion.id'), 
        nullable=True
    )
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    sync_status: Mapped[str] = mapped_column(
        String(50), 
        nullable=False, 
        default='pending'  # pending, syncing, synced, error
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Table arguments
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )
    
    # Pydantic v2 config
    model_config = ConfigDict(from_attributes=True)
    
    @classmethod
    def get_or_create(
        cls, 
        db: Session, 
        document_id: int, 
        node_id: str
    ) -> 'DocumentSyncStatus':
        """Get or create a sync status for a document and node."""
        status = (
            db.query(cls)
            .filter(
                cls.document_id == document_id,
                cls.node_id == node_id
            )
            .first()
        )
        
        if not status:
            status = cls(
                document_id=document_id,
                node_id=node_id,
                sync_status='pending'
            )
            db.add(status)
            db.commit()
            db.refresh(status)
            
        return status
