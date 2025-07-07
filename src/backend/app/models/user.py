from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, Table
from sqlalchemy.orm import relationship, declared_attr
from sqlalchemy.ext.declarative import has_inherited_table
from app.db.base import BaseModel  # Import BaseModel from the new location

# Import the association table for the many-to-many relationship
from app.models.role import user_roles

class User(BaseModel):
    __tablename__ = "users"
    
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    
    # Foreign keys
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    
    # Relationships using @declared_attr to handle deferred configuration
    @declared_attr
    def notifications(cls):
        return relationship(
            "Notification", 
            back_populates="user", 
            lazy="dynamic",
            cascade="all, delete-orphan"
        )
    
    @declared_attr
    def company(cls):
        return relationship("Company", back_populates="users")
    
    @declared_attr
    def department(cls):
        return relationship("Department", back_populates="users")
    
    @declared_attr
    def roles(cls):
        return relationship('Role', secondary=user_roles, back_populates='users')
    
    @declared_attr
    def chat_messages(cls):
        return relationship(
            "ChatMessage", 
            back_populates="user",
            lazy="dynamic",
            cascade="all, delete-orphan"
        )
    
    @declared_attr
    def chat_conversations(cls):
        return relationship(
            "ChatConversation", 
            back_populates="user",
            lazy="dynamic",
            cascade="all, delete-orphan"
        )
    
    @declared_attr
    def documents(cls):
        return relationship(
            "Document", 
            back_populates="owner",
            lazy="dynamic",
            cascade="all, delete-orphan"
        )
    
    # Memory relationships
    @declared_attr
    def memory_interactions(cls):
        return relationship(
            "MemoryInteraction",
            back_populates="user",
            lazy="dynamic",
            cascade="all, delete-orphan"
        )
        
    @declared_attr
    def memory_contexts(cls):
        return relationship(
            "MemoryContext",
            back_populates="user",
            lazy="dynamic",
            cascade="all, delete-orphan"
        )
        
    @declared_attr
    def memory_sessions(cls):
        return relationship(
            "MemorySession",
            back_populates="user",
            lazy="dynamic",
            cascade="all, delete-orphan"
        )
        
    # Department Request relationships
    @declared_attr
    def requests_made(cls):
        return relationship(
            "DepartmentRequest",
            foreign_keys="DepartmentRequest.requester_id",
            back_populates="requester",
            lazy="dynamic",
            cascade="all, delete-orphan"
        )
        
    @declared_attr
    def requests_approved(cls):
        return relationship(
            "DepartmentRequest",
            foreign_keys="DepartmentRequest.approver_id",
            back_populates="approver",
            lazy="dynamic"
        )
        
    @declared_attr
    def request_comments(cls):
        return relationship(
            "RequestComment",
            back_populates="user",
            lazy="dynamic",
            cascade="all, delete-orphan"
        )
        
    @declared_attr
    def request_history(cls):
        return relationship(
            "RequestHistory",
            back_populates="user",
            lazy="dynamic",
            cascade="all, delete-orphan"
        )
        
    @declared_attr
    def request_attachments(cls):
        return relationship(
            "RequestAttachment",
            back_populates="user",
            lazy="dynamic",
            cascade="all, delete-orphan"
        )
