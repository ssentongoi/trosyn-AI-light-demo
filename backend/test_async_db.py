"""Test async database connection with minimal setup."""

import asyncio

# Configure logging
import logging
import os
import sys

from sqlalchemy import Column, Integer, String, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Use in-memory SQLite with aiosqlite
DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create base model
Base = declarative_base()


# Simple model for testing
class TestModel(Base):
    __tablename__ = "test_table"
    id = Column(Integer, primary_key=True)
    name = Column(String(50))


async def test_connection():
    """Test async database connection and basic operations."""
    # Create engine with explicit aiosqlite driver
    engine = create_async_engine(
        DATABASE_URL, echo=True, future=True, connect_args={"check_same_thread": False}
    )

    try:
        # Create tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # Create session factory
        async_session = sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )

        # Test session
        async with async_session() as session:
            # Insert
            test_record = TestModel(name="Test Record")
            session.add(test_record)
            await session.commit()

            # Query
            result = await session.execute(select(TestModel))
            records = result.scalars().all()

            logger.info(f"Found {len(records)} records")
            for record in records:
                logger.info(f"Record: id={record.id}, name={record.name}")

            # Clean up
            await session.delete(test_record)
            await session.commit()

        logger.info("Database test completed successfully!")
        return True

    except Exception as e:
        logger.error(f"Database test failed: {str(e)}", exc_info=True)
        return False
    finally:
        await engine.dispose()


if __name__ == "__main__":
    logger.info("Starting database test...")
    asyncio.run(test_connection())
