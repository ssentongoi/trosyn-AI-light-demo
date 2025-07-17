#!/usr/bin/env python3
"""
Standalone script to initialize the database tables and create default roles and permissions.
This script bypasses the FastAPI application startup process and directly creates all required tables and data.
"""
import asyncio
import logging
import os
import sys
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Add the backend directory to Python path
BACKEND_DIR = Path(__file__).parent
sys.path.append(str(BACKEND_DIR))


async def init_database_with_defaults():
    """Initialize the database tables and create default roles and permissions."""
    try:
        # Import SQLAlchemy components
        from sqlalchemy.future import select
        from sqlalchemy.orm import configure_mappers

        from app.database import async_session_factory, engine

        # Import base model and engine
        from app.db.base import Base
        from app.models.permission import Permission
        from app.models.role import Role

        logger.info("Step 1: Importing models in specific order")

        # Import models in the order specified in models/__init__.py
        from app.models import Notification

        logger.info("✓ Imported Notification model")

        from app.models import User

        logger.info("✓ Imported User model")

        from app.models import Company

        logger.info("✓ Imported Company model")

        from app.models import Department

        logger.info("✓ Imported Department model")

        from app.models import Role

        logger.info("✓ Imported Role model")

        from app.models import Permission

        logger.info("✓ Imported Permission model")

        from app.models import Document

        logger.info("✓ Imported Document model")

        logger.info("Step 2: Configuring SQLAlchemy mappers")
        configure_mappers()
        logger.info("✓ SQLAlchemy mappers configured successfully")

        logger.info("Step 3: Creating database tables")
        async with engine.begin() as conn:
            # Create all tables
            await conn.run_sync(Base.metadata.create_all)

        logger.info("✓ Database tables created successfully")

        # Verify that tables were created
        from sqlalchemy import text

        async with engine.connect() as conn:
            # Get list of tables
            result = await conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table'")
            )
            tables = [row[0] for row in result]

            logger.info(f"Tables in database: {tables}")

            # Check for specific tables
            expected_tables = [
                "users",
                "companies",
                "departments",
                "documents",
                "roles",
                "permissions",
                "role_permissions",
            ]
            for table in expected_tables:
                if table in tables:
                    logger.info(f"✓ Table '{table}' exists")
                else:
                    logger.error(f"✗ Table '{table}' does not exist")

        logger.info("Step 4: Creating default roles and permissions")
        async with async_session_factory() as session:
            try:
                # Create default permissions
                permissions = [
                    {
                        "name": "user:read",
                        "description": "Read user data",
                        "resource": "user",
                        "action": "read",
                    },
                    {
                        "name": "user:write",
                        "description": "Create/update users",
                        "resource": "user",
                        "action": "write",
                    },
                    {
                        "name": "user:delete",
                        "description": "Delete users",
                        "resource": "user",
                        "action": "delete",
                    },
                    {
                        "name": "role:read",
                        "description": "Read role data",
                        "resource": "role",
                        "action": "read",
                    },
                    {
                        "name": "role:write",
                        "description": "Create/update roles",
                        "resource": "role",
                        "action": "write",
                    },
                    {
                        "name": "role:delete",
                        "description": "Delete roles",
                        "resource": "role",
                        "action": "delete",
                    },
                    {
                        "name": "permission:read",
                        "description": "Read permission data",
                        "resource": "permission",
                        "action": "read",
                    },
                    {
                        "name": "permission:assign",
                        "description": "Assign permissions to roles",
                        "resource": "permission",
                        "action": "assign",
                    },
                ]

                for perm_data in permissions:
                    result = await session.execute(
                        select(Permission).filter(Permission.name == perm_data["name"])
                    )
                    perm = result.scalars().first()
                    if not perm:
                        logger.info(f"Creating permission: {perm_data['name']}")
                        perm = Permission(**perm_data)
                        session.add(perm)

                await session.commit()
                logger.info("✓ Default permissions created")

                # Create default roles
                result = await session.execute(
                    select(Role).filter(Role.name == "admin")
                )
                admin_role = result.scalars().first()

                if not admin_role:
                    logger.info("Creating admin role")
                    admin_role = Role(
                        name="admin", description="Administrator with full access"
                    )
                    session.add(admin_role)
                    await session.commit()

                    # Assign all permissions to admin role
                    result = await session.execute(select(Permission))
                    all_perms = result.scalars().all()
                    admin_role.permissions = all_perms
                    await session.commit()
                    logger.info("✓ Admin role created with all permissions")

                # Create default user role if it doesn't exist
                result = await session.execute(select(Role).filter(Role.name == "user"))
                user_role = result.scalars().first()

                if not user_role:
                    logger.info("Creating user role")
                    user_role = Role(
                        name="user", description="Regular user with basic access"
                    )
                    session.add(user_role)
                    await session.commit()

                    # Assign basic permissions to user role
                    result = await session.execute(
                        select(Permission).filter(
                            Permission.name.in_(
                                ["user:read", "role:read", "permission:read"]
                            )
                        )
                    )
                    basic_perms = result.scalars().all()
                    user_role.permissions = basic_perms
                    await session.commit()
                    logger.info("✓ User role created with basic permissions")

                logger.info("✓ Default roles and permissions created successfully")

            except Exception as e:
                logger.error(f"Error creating default roles and permissions: {str(e)}")
                await session.rollback()
                raise

        logger.info("Database initialization completed successfully")
        return True

    except Exception as e:
        logger.error(f"Error during database initialization: {str(e)}")
        import traceback

        logger.error(traceback.format_exc())
        return False


if __name__ == "__main__":
    success = asyncio.run(init_database_with_defaults())
    if success:
        print("\n✅ Database initialization with defaults successful")
        sys.exit(0)
    else:
        print("\n❌ Database initialization with defaults failed")
        sys.exit(1)
