"""
Script to run database migrations.
"""
import os
import sys
from alembic.config import Config
from alembic import command

def run_migrations():
    """Run database migrations."""
    # Get the project root directory
    project_root = os.path.dirname(os.path.abspath(__file__))
    
    # Set up the Alembic configuration
    alembic_cfg = Config(os.path.join(project_root, "alembic.ini"))
    
    # Run the migrations
    command.upgrade(alembic_cfg, "head")
    print("Database migrations completed successfully.")

if __name__ == "__main__":
    run_migrations()
