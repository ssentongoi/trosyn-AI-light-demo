"""
Script to generate and run the migration for the sync_sessions table.
"""
import os
import sys
from alembic.config import Config
from alembic import command

def create_sync_sessions_migration():
    """Generate and run the migration for the sync_sessions table."""
    # Get the project root directory
    project_root = os.path.dirname(os.path.abspath(__file__))
    
    # Set up the Alembic configuration
    alembic_cfg = Config(os.path.join(project_root, "alembic.ini"))
    
    # Generate the migration
    print("Generating migration for sync_sessions table...")
    try:
        command.revision(
            config=alembic_cfg,
            autogenerate=True,
            message="Add sync_sessions table",
            rev_id=None,
            version_path=None,
            head="head",
            splice=False,
            branch_label=None
        )
    except Exception as e:
        print(f"Error generating migration: {e}")
        print("Make sure the database URL is correctly configured in your settings.")
        print(f"Current database URL: {alembic_cfg.get_main_option('sqlalchemy.url')}")
        return
    
    # Run the migration
    print("Running migration...")
    command.upgrade(alembic_cfg, "head")
    
    print("Migration for sync_sessions table completed successfully.")

if __name__ == "__main__":
    create_sync_sessions_migration()
