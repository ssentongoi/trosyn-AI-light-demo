from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.permission import Permission
from app.models.role import Role
from app.models.user import User
from app.schemas.role import (
    PermissionAssignment,
    PermissionCreate,
    PermissionInDB,
    RoleCreate,
    RoleInDB,
    RoleUpdate,
    UserRoleAssignment,
)


class RoleService:
    @staticmethod
    async def create_role(db: AsyncSession, role: RoleCreate) -> RoleInDB:
        db_role = Role(name=role.name, description=role.description)
        db.add(db_role)
        await db.commit()
        await db.refresh(db_role)
        return RoleInDB.from_orm(db_role)

    @staticmethod
    async def get_role(db: AsyncSession, role_id: int) -> Optional[RoleInDB]:
        result = await db.execute(select(Role).filter(Role.id == role_id))
        db_role = result.scalars().first()
        return RoleInDB.from_orm(db_role) if db_role else None

    @staticmethod
    async def get_role_by_name(db: AsyncSession, name: str) -> Optional[RoleInDB]:
        result = await db.execute(select(Role).filter(Role.name == name))
        db_role = result.scalars().first()
        return RoleInDB.from_orm(db_role) if db_role else None

    @staticmethod
    async def get_roles(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[RoleInDB]:
        result = await db.execute(select(Role).offset(skip).limit(limit))
        roles = result.scalars().all()
        return [RoleInDB.from_orm(role) for role in roles]

    @staticmethod
    async def update_role(
        db: AsyncSession, role_id: int, role: RoleUpdate
    ) -> Optional[RoleInDB]:
        result = await db.execute(select(Role).filter(Role.id == role_id))
        db_role = result.scalars().first()
        if not db_role:
            return None

        update_data = role.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_role, field, value)

        db.add(db_role)
        await db.commit()
        await db.refresh(db_role)
        return RoleInDB.from_orm(db_role)

    @staticmethod
    async def delete_role(db: AsyncSession, role_id: int) -> bool:
        result = await db.execute(select(Role).filter(Role.id == role_id))
        db_role = result.scalars().first()
        if not db_role:
            return False

        await db.delete(db_role)
        await db.commit()
        return True

    @staticmethod
    async def assign_role_to_user(db: AsyncSession, user_id: int, role_id: int) -> bool:
        user_result = await db.execute(select(User).filter(User.id == user_id))
        user = user_result.scalars().first()

        role_result = await db.execute(select(Role).filter(Role.id == role_id))
        role = role_result.scalars().first()

        if not user or not role:
            return False

        if role not in user.roles:
            user.roles.append(role)
            await db.commit()

        return True

    @staticmethod
    async def remove_role_from_user(
        db: AsyncSession, user_id: int, role_id: int
    ) -> bool:
        user_result = await db.execute(select(User).filter(User.id == user_id))
        user = user_result.scalars().first()

        role_result = await db.execute(select(Role).filter(Role.id == role_id))
        role = role_result.scalars().first()

        if not user or not role:
            return False

        if role in user.roles:
            user.roles.remove(role)
            await db.commit()

        return True


class PermissionService:
    @staticmethod
    async def create_permission(
        db: AsyncSession, permission: PermissionCreate
    ) -> PermissionInDB:
        db_permission = Permission(
            name=permission.name,
            description=permission.description,
            resource=permission.resource,
            action=permission.action,
        )
        db.add(db_permission)
        await db.commit()
        await db.refresh(db_permission)
        return PermissionInDB.from_orm(db_permission)

    @staticmethod
    async def get_permission_by_name(
        db: AsyncSession, name: str
    ) -> Optional[PermissionInDB]:
        result = await db.execute(select(Permission).filter(Permission.name == name))
        db_permission = result.scalars().first()
        return PermissionInDB.from_orm(db_permission) if db_permission else None

    @staticmethod
    async def assign_permission_to_role(
        db: AsyncSession, role_id: int, permission_id: int
    ) -> bool:
        role_result = await db.execute(select(Role).filter(Role.id == role_id))
        role = role_result.scalars().first()

        permission_result = await db.execute(
            select(Permission).filter(Permission.id == permission_id)
        )
        permission = permission_result.scalars().first()

        if not role or not permission:
            return False

        if permission not in role.permissions:
            role.permissions.append(permission)
            await db.commit()

        return True

    @staticmethod
    async def remove_permission_from_role(
        db: AsyncSession, role_id: int, permission_id: int
    ) -> bool:
        role_result = await db.execute(select(Role).filter(Role.id == role_id))
        role = role_result.scalars().first()

        permission_result = await db.execute(
            select(Permission).filter(Permission.id == permission_id)
        )
        permission = permission_result.scalars().first()

        if not role or not permission:
            return False

        if permission in role.permissions:
            role.permissions.remove(permission)
            await db.commit()

        return True

    @staticmethod
    async def check_permission(
        db: AsyncSession, user_id: int, resource: str, action: str
    ) -> bool:
        from sqlalchemy import or_
        from sqlalchemy.orm import selectinload

        # First, get the user with their roles and permissions loaded
        stmt = (
            select(User)
            .options(selectinload(User.roles).selectinload(Role.permissions))
            .filter(User.id == user_id)
        )

        result = await db.execute(stmt)
        user = result.scalars().first()

        if not user:
            return False

        # Check if user has the required permission through any of their roles
        for role in user.roles:
            for permission in role.permissions:
                if permission.resource == resource and permission.action == action:
                    return True

        return False
