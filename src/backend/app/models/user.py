from sqlalchemy import Boolean, Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import BaseModel  # Import BaseModel from the new location

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
    
    # Relationships
    notifications = relationship(
        "Notification", 
        back_populates="user", 
        lazy="dynamic",
        cascade="all, delete-orphan"
    )
    
    # Relationships to Company and Department
    company = relationship("Company", back_populates="users")
    department = relationship("Department", back_populates="users")
    
    # Relationship to Document (one-to-many)
    documents = relationship(
        "Document", 
        back_populates="user",
        lazy="dynamic",
        cascade="all, delete-orphan"
    )
