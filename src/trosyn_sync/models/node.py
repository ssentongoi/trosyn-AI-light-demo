"""
Node and sync status models for the sync service.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from sqlalchemy import String, Text, Integer, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship, Session, Mapped, mapped_column
from sqlalchemy.sql import func
from pydantic import ConfigDict
from .base import Base, BaseMixin


class Node(Base, BaseMixin):
    """Represents a node in the sync network."""
    __tablename__ = 'node'
    
    # Define columns with type annotations for SQLAlchemy 2.0
    node_id: Mapped[str] = mapped_column(
        String(64), 
        unique=True, 
        nullable=False, 
        index=True
    )
    node_type: Mapped[str] = mapped_column(
        String(32), 
        nullable=False  # 'TROSYSN_ADMIN_HUB' or 'TROSYSN_DEPT_NODE'
    )
    display_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    hostname: Mapped[str] = mapped_column(String(255), nullable=False)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)  # Supports both IPv4 and IPv6
    port: Mapped[int] = mapped_column(Integer, nullable=False)
    api_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)  # Base URL of the node's API
    last_seen: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_online: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_trusted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # Whether this node is trusted
    capabilities: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)  # Node capabilities
    metadata_: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        'metadata', 
        JSON, 
        nullable=True
    )  # Custom metadata
    
    # Relationships
    sync_statuses: Mapped[List["NodeSyncStatus"]] = relationship(
        "NodeSyncStatus", 
        back_populates="node"
    )
    
    # Pydantic v2 config
    model_config = ConfigDict(from_attributes=True)
    
    @classmethod
    def get_by_node_id(cls, db: Session, node_id: str) -> Optional['Node']:
        """Get a node by its node ID."""
        return db.query(cls).filter(cls.node_id == node_id).first()
    
    @classmethod
    def get_online_nodes(cls, db: Session) -> List['Node']:
        """Get all online nodes."""
        return db.query(cls).filter(cls.is_online == True).all()
    
    def update_heartbeat(self, db: Session) -> None:
        """Update the last seen timestamp and set as online."""
        self.last_seen = func.now()
        self.is_online = True
        db.commit()


class NodeSyncStatus(Base, BaseMixin):
    """Tracks sync status between this node and another node."""
    __tablename__ = 'nodesyncstatus'
    
    # Define columns with type annotations for SQLAlchemy 2.0
    node_id: Mapped[int] = mapped_column(
        Integer, 
        ForeignKey('node.id'), 
        nullable=False, 
        index=True
    )
    remote_node_id: Mapped[str] = mapped_column(
        String(64), 
        nullable=False, 
        index=True
    )
    last_sync_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), 
        nullable=True
    )
    last_successful_sync: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), 
        nullable=True
    )
    sync_status: Mapped[str] = mapped_column(
        String(50), 
        nullable=False, 
        default='idle'  # idle, syncing, error
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sync_direction: Mapped[str] = mapped_column(
        String(20), 
        nullable=False, 
        default='bidirectional'  # push, pull, bidirectional
    )
    sync_interval_seconds: Mapped[Optional[int]] = mapped_column(
        Integer, 
        nullable=True  # Null means manual sync only
    )
    
    # Relationships
    node: Mapped["Node"] = relationship("Node", back_populates="sync_statuses")
    
    # Pydantic v2 config
    model_config = ConfigDict(from_attributes=True)
    
    @classmethod
    def get_or_create(
        cls, 
        db: Session, 
        node_id: int, 
        remote_node_id: str
    ) -> 'NodeSyncStatus':
        """Get or create a sync status for a node pair."""
        status = (
            db.query(cls)
            .filter(
                cls.node_id == node_id,
                cls.remote_node_id == remote_node_id
            )
            .first()
        )
        
        if not status:
            status = cls(
                node_id=node_id,
                remote_node_id=remote_node_id,
                sync_status='idle'
            )
            db.add(status)
            db.commit()
            db.refresh(status)
            
        return status
    
    def update_sync_status(
        self, 
        db: Session, 
        status: str, 
        error_message: Optional[str] = None
    ) -> None:
        """Update the sync status and timestamps."""
        self.sync_status = status
        self.last_sync_time = func.now()
        
        if status == 'success':
            self.last_successful_sync = self.last_sync_time
            self.error_message = None
        elif status == 'error' and error_message:
            self.error_message = error_message
            
        db.commit()


class SyncQueue(Base, BaseMixin):
    """Queue of documents that need to be synced with other nodes."""
    __tablename__ = 'syncqueue'
    
    # Define columns with type annotations for SQLAlchemy 2.0
    document_id: Mapped[int] = mapped_column(
        Integer, 
        ForeignKey('document.id'), 
        nullable=False, 
        index=True
    )
    node_id: Mapped[int] = mapped_column(
        Integer, 
        ForeignKey('node.id'), 
        nullable=False, 
        index=True
    )
    version_id: Mapped[Optional[int]] = mapped_column(
        Integer, 
        ForeignKey('documentversion.id'), 
        nullable=True
    )
    priority: Mapped[int] = mapped_column(
        Integer, 
        default=0, 
        nullable=False  # Higher number = higher priority
    )
    status: Mapped[str] = mapped_column(
        String(20), 
        default='pending', 
        nullable=False  # pending, in_progress, completed, failed
    )
    retry_count: Mapped[int] = mapped_column(
        Integer, 
        default=0, 
        nullable=False
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Table arguments
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )
    
    # Pydantic v2 config
    model_config = ConfigDict(from_attributes=True)
    
    @classmethod
    def get_pending_items(
        cls, 
        db: Session, 
        node_id: int, 
        limit: int = 100
    ) -> List['SyncQueue']:
        """Get pending sync items for a node, ordered by priority and creation time."""
        return (
            db.query(cls)
            .filter(
                cls.node_id == node_id,
                cls.status == 'pending'
            )
            .order_by(cls.priority.desc(), cls.created_at.asc())
            .limit(limit)
            .all()
        )
    
    def mark_started(self, db: Session) -> None:
        """Mark the sync as started."""
        self.status = 'in_progress'
        self.started_at = func.now()
        self.retry_count += 1
        db.commit()
    
    def mark_completed(self, db: Session) -> None:
        """Mark the sync as completed successfully."""
        self.status = 'completed'
        self.completed_at = func.now()
        db.commit()
    
    def mark_failed(self, db: Session, error: str) -> None:
        """Mark the sync as failed."""
        self.status = 'failed' if self.retry_count >= 3 else 'pending'
        self.error_message = error
        self.completed_at = func.now()
        db.commit()
