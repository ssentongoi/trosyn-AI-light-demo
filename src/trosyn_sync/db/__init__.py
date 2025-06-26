"""
Database initialization and migration utilities.
"""
import logging
from pathlib import Path
from typing import Generator, Optional

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, scoped_session, Session as DBSession

from ..models.base import Base, engine, SessionLocal

# Re-export get_db from models.base
from ..models.base import get_db

logger = logging.getLogger(__name__)

def init_db() -> None:
    """Initialize the database by creating all tables."""
    logger.info("Initializing database...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized")

def reset_db() -> None:
    """
    Reset the database by dropping and recreating all tables.
    
    WARNING: This will delete all data in the database!
    """
    logger.warning("Resetting database...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    logger.info("Database reset complete")

def get_session() -> DBSession:
    """Get a new database session."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

# Enable foreign key support for SQLite
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()
