#!/usr/bin/env python3
"""
Test script to diagnose SQLAlchemy model registration and circular import issues.
This script attempts to initialize the SQLAlchemy models outside of the FastAPI application
to isolate and diagnose the model registration issue.
"""
import os
import sys
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

# Add the backend directory to Python path
BACKEND_DIR = Path(__file__).parent
sys.path.append(str(BACKEND_DIR))

def test_model_registration():
    """Test SQLAlchemy model registration and circular import resolution."""
    try:
        # Import SQLAlchemy components
        from sqlalchemy.orm import configure_mappers, declarative_base
        from sqlalchemy import inspect

        # Import base model
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
        
        # Document is not in __init__.py but we need it for the test
        from app.models.document import Document
        logger.info("✓ Imported Document model")
        
        logger.info("Step 2: Configuring SQLAlchemy mappers")
        configure_mappers()
        logger.info("✓ SQLAlchemy mappers configured successfully")
        
        logger.info("Step 3: Verifying model relationships")
        
        # Check User model relationships
        user_mapper = inspect(User)
        user_relationships = {rel.key: rel for rel in user_mapper.relationships}
        logger.info(f"User relationships: {list(user_relationships.keys())}")
        
        # Check Document model relationships
        document_mapper = inspect(Document)
        document_relationships = {rel.key: rel for rel in document_mapper.relationships}
        logger.info(f"Document relationships: {list(document_relationships.keys())}")
        
        # Verify the specific relationships we're concerned about
        if 'documents' in user_relationships:
            logger.info("✓ User.documents relationship is properly configured")
        else:
            logger.error("✗ User.documents relationship is missing")
            
        if 'owner' in document_relationships:
            logger.info("✓ Document.owner relationship is properly configured")
        else:
            logger.error("✗ Document.owner relationship is missing")
            
        logger.info("Model registration test completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"Error during model registration test: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    success = test_model_registration()
    if success:
        print("\n✅ Model registration test passed")
        sys.exit(0)
    else:
        print("\n❌ Model registration test failed")
        sys.exit(1)
