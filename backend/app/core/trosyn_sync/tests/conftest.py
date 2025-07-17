"""
Pytest configuration and fixtures for Trosyn Sync tests.
"""

import asyncio

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from trosyn_sync.models.base import Base

# Test configuration
TEST_DATABASE_URL = "sqlite:///:memory:"


# Async test configuration
@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="session")
def engine():
    """Create and configure a test database engine."""
    return create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})


@pytest.fixture(scope="function")
def db(engine):
    """Create a fresh database session with a rollback at the end of the test."""
    # Create all tables with explicit ordering to handle foreign key constraints
    tables = [
        "nodesynclog",
        "syncqueue",
        "nodesyncstatus",
        "node",
        "documentsyncstatus",
        "documentversion",
        "documentlock",
        "document",
    ]

    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Create a new session
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, expire_on_commit=False)

    yield session

    # Teardown
    session.close()
    transaction.rollback()

    # Drop tables in reverse order to handle foreign key constraints
    with engine.connect() as conn:
        # Disable foreign key checks
        conn.execute(text("PRAGMA foreign_keys = OFF"))

        # Drop all tables
        for table in tables:
            try:
                conn.execute(text(f"DROP TABLE IF EXISTS {table}"))
            except Exception as e:
                print(f"Warning: Could not drop table {table}: {e}")

        # Re-enable foreign key checks
        conn.execute(text("PRAGMA foreign_keys = ON"))
        conn.commit()

    connection.close()
