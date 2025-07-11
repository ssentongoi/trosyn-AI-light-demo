"""
Direct migration script for the sync_sessions table.
This script creates the sync_sessions table directly using SQLAlchemy.
"""
import os
import sys
from sqlalchemy import create_engine, MetaData, Table, Column, Integer, String, DateTime, JSON, Text, func
from sqlalchemy.dialects.sqlite import JSON as SQLiteJSON
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Database URL - using SQLite for simplicity
DATABASE_URL = "sqlite:///./trosyn_ai.db"

def create_sync_sessions_table():
    """Create the sync_sessions table if it doesn't exist."""
    try:
        # Create engine and connect to the database
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
        metadata = MetaData()
        
        # Define the sync_sessions table
        sync_sessions = Table(
            'sync_sessions',
            metadata,
            Column('id', String(36), primary_key=True, index=True),
            Column('status', String(20), nullable=False, index=True),
            Column('started_at', DateTime, default=datetime.utcnow, nullable=False),
            Column('completed_at', DateTime, nullable=True),
            Column('source_node_id', String(36), nullable=False, index=True),
            Column('target_node_id', String(36), nullable=True, index=True),
            Column('documents_pushed', Integer, default=0, nullable=False),
            Column('documents_pulled', Integer, default=0, nullable=False),
            Column('conflicts_resolved', Integer, default=0, nullable=False),
            Column('conflict_strategy', String(20), nullable=True),
            Column('error_message', Text, nullable=True),
            Column('metadata_', SQLiteJSON, nullable=True, default=dict),
            Column('created_at', DateTime, default=datetime.utcnow, nullable=False),
            Column('updated_at', DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False),
        )
        
        # Create the table
        metadata.create_all(bind=engine)
        print("✅ Successfully created sync_sessions table")
        return True
        
    except Exception as e:
        print(f"❌ Error creating sync_sessions table: {e}")
        return False

def verify_table_structure():
    """Verify that the sync_sessions table was created with the correct structure."""
    try:
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
        metadata = MetaData()
        
        # Reflect the table
        sync_sessions = Table('sync_sessions', metadata, autoload_with=engine)
        
        # Check if all expected columns exist
        expected_columns = {
            'id', 'status', 'started_at', 'completed_at', 'source_node_id',
            'target_node_id', 'documents_pushed', 'documents_pulled',
            'conflicts_resolved', 'conflict_strategy', 'error_message',
            'metadata_', 'created_at', 'updated_at'
        }
        
        actual_columns = set(column.name for column in sync_sessions.columns)
        
        if expected_columns.issubset(actual_columns):
            print("✅ sync_sessions table has all expected columns")
            return True
        else:
            missing_columns = expected_columns - actual_columns
            print(f"❌ sync_sessions table is missing columns: {missing_columns}")
            return False
            
    except Exception as e:
        print(f"❌ Error verifying sync_sessions table: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting direct migration for sync_sessions table...")
    
    # Create the table
    if create_sync_sessions_table():
        # Verify the table structure
        if verify_table_structure():
            print("✨ Migration completed successfully!")
        else:
            print("⚠️  Migration completed with verification issues. Please check the table structure.")
    else:
        print("❌ Migration failed. Please check the error messages above.")
