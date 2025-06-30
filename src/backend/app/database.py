from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
import logging

# Import Base from db.base to avoid circular imports
from app.db.base import Base

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Database URL from environment or default to SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./trosyn_ai.db")

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    echo=True  # Enable SQL query logging
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency to get DB session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def import_models():
    """Import all models to ensure they are registered with SQLAlchemy"""
    # Import all models to ensure they are registered with SQLAlchemy
    from app.models.user import User
    from app.models.company import Company
    from app.models.department import Department
    from app.models.notification import Notification
    from app.models.document import Document
    
    # Return the Base class that all models inherit from
    from app.db.base import Base
    return Base

def create_tables():
    """Create all database tables"""
    logger.info("Creating database tables...")
    try:
        # Import models and get Base
        Base = import_models()
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}", exc_info=True)
        raise

def init_db():
    """Initialize the database (for backward compatibility)"""
    create_tables()
