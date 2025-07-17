#!/usr/bin/env python3
"""
Standalone script to initialize the database tables directly.
This script bypasses the FastAPI application startup process and directly creates all required tables.
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


async def init_database():
    """Initialize the database tables directly."""
    try:
        # Import SQLAlchemy components
        from sqlalchemy.orm import configure_mappers

        from app.database import async_session_factory, engine

        # Import base model and engine
        from app.db.base import Base

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
            # Drop all tables first to ensure a clean slate
            # Comment this line out if you want to preserve existing data
            # await conn.run_sync(Base.metadata.drop_all)

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

        logger.info("Database initialization completed successfully")
        return True

    except Exception as e:
        logger.error(f"Error during database initialization: {str(e)}")
        import traceback

        logger.error(traceback.format_exc())
        return False


if __name__ == "__main__":
    success = asyncio.run(init_database())
    if success:
        print("\n✅ Database initialization successful")
        sys.exit(0)
    else:
        print("\n❌ Database initialization failed")
        sys.exit(1)
