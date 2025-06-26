"""
Pytest configuration and fixtures for Trosyn Sync tests.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from trosyn_sync.models.base import Base

# Test database configuration
TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="session")
def engine():
    """Create and configure a test database engine."""
    return create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})

@pytest.fixture(scope="function")
def db(engine):
    """Create a fresh database session with a rollback at the end of the test."""
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Create a new session
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    
    yield session
    
    # Teardown
    session.close()
    transaction.rollback()
    connection.close()
    
    # Clean up tables for the next test
    Base.metadata.drop_all(bind=engine)
