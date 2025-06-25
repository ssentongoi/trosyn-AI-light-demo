from sqlalchemy.orm import Session
from typing import Optional
from ..core.security import get_password_hash
from ..models.user import User as UserModel
from ..schemas.user import UserCreate, UserInDB, UserUpdate

def get_user(db: Session, user_id: int) -> Optional[UserModel]:
    """Get a user by ID"""
    return db.query(UserModel).filter(UserModel.id == user_id).first()

def get_user_by_username(db: Session, username: str) -> Optional[UserModel]:
    """Get a user by username"""
    return db.query(UserModel).filter(UserModel.username == username).first()

def get_user_by_email(db: Session, email: str) -> Optional[UserModel]:
    """Get a user by email"""
    return db.query(UserModel).filter(UserModel.email == email).first()

def create_user(db: Session, user: UserCreate) -> UserModel:
    """Create a new user"""
    hashed_password = get_password_hash(user.password)
    db_user = UserModel(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
        is_active=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(
    db: Session, db_user: UserModel, user_update: UserUpdate
) -> UserModel:
    """Update a user"""
    update_data = user_update.dict(exclude_unset=True)
    
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data["password"])
        del update_data["password"]
    
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int) -> UserModel:
    """Delete a user"""
    db_user = get_user(db, user_id=user_id)
    if not db_user:
        return None
    db.delete(db_user)
    db.commit()
    return db_user
