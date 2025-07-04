"""
Base database models and configuration.
"""
from datetime import datetime
from typing import Any, Optional, Dict, TypeVar, Type, Generic, List, Union

from sqlalchemy import create_engine, Integer, String, Text, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import sessionmaker, scoped_session, Session as DBSession, Mapped, mapped_column, DeclarativeBase, declared_attr
from sqlalchemy.sql import func
from pydantic import BaseModel, ConfigDict

# Type variable for model instances
ModelType = TypeVar("ModelType", bound="Base")



class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    
    # Pydantic v2 config
    model_config = ConfigDict(
        from_attributes=True,
        arbitrary_types_allowed=True,
        validate_assignment=True
    )
    
    # Common columns with type annotations for SQLAlchemy 2.0
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    def __init__(self, **kwargs):
        # Initialize the DeclarativeBase first
        super().__init__()
        
        # Set attributes from kwargs
        for key, value in kwargs.items():
            setattr(self, key, value)
            
        # Ensure timestamps are set on creation
        now = datetime.utcnow()
        if not hasattr(self, 'created_at') or self.created_at is None:
            self.created_at = now
        if not hasattr(self, 'updated_at') or self.updated_at is None:
            self.updated_at = now
    
    @declared_attr.directive
    def __tablename__(cls) -> str:
        """Generate table name from class name."""
        return cls.__name__.lower()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary."""
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
            if column.name not in ('created_at', 'updated_at')
        }


class BaseMixin:
    """Mixin class for common model functionality."""
    
    # Pydantic v2 config
    model_config = ConfigDict(from_attributes=True)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary."""
        if not hasattr(self, '__table__'):
            return {}
            
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
            if column.name not in ('created_at', 'updated_at')
        }



