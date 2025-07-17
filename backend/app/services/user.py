from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from ..core.security import get_password_hash
from ..models.user import User as UserModel
from ..schemas.user import UserCreate, UserInDB, UserUpdate


async def get_user(db: AsyncSession, user_id: int) -> Optional[UserModel]:
    """Get a user by ID"""
    result = await db.execute(select(UserModel).filter(UserModel.id == user_id))
    return result.scalars().first()


async def get_user_by_username(db: AsyncSession, username: str) -> Optional[UserModel]:
    """Get a user by username"""
    result = await db.execute(select(UserModel).filter(UserModel.username == username))
    return result.scalars().first()


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[UserModel]:
    """Get a user by email"""
    result = await db.execute(select(UserModel).filter(UserModel.email == email))
    return result.scalars().first()


async def create_user(db: AsyncSession, user: UserCreate) -> UserModel:
    """Create a new user"""
    hashed_password = get_password_hash(user.password)
    db_user = UserModel(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
        is_active=True,
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


async def update_user(
    db: AsyncSession, db_user: UserModel, user_update: UserUpdate
) -> UserModel:
    """Update a user"""
    update_data = user_update.dict(exclude_unset=True)

    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data["password"])
        del update_data["password"]

    for field, value in update_data.items():
        setattr(db_user, field, value)

    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


async def delete_user(db: AsyncSession, user_id: int) -> bool:
    """Delete a user"""
    result = await db.execute(select(UserModel).filter(UserModel.id == user_id))
    db_user = result.scalars().first()
    if db_user:
        await db.delete(db_user)
        await db.commit()
        return True
    return False


async def get_users(
    db: AsyncSession, skip: int = 0, limit: int = 100, is_active: Optional[bool] = None
) -> List[UserModel]:
    """Get list of users with optional filtering"""
    query = select(UserModel)

    if is_active is not None:
        query = query.filter(UserModel.is_active == is_active)

    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()


async def update_user_status(
    db: AsyncSession, user_id: int, is_active: bool
) -> Optional[UserModel]:
    """Update user's active status"""
    result = await db.execute(select(UserModel).filter(UserModel.id == user_id))
    db_user = result.scalars().first()

    if not db_user:
        return None

    db_user.is_active = is_active
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user
