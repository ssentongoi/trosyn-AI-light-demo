"""
Initialize the database and run migrations.
"""
import os
import sys
from alembic.config import Config
from alembic import command

def init_database():
    """Initialize the database and run migrations."""
    # Get the project root directory
    project_root = os.path.dirname(os.path.abspath(__file__))
    
    # Set up the Alembic configuration
    alembic_cfg = Config(os.path.join(project_root, "alembic.ini"))
    
    # Create the migrations directory if it doesn't exist
    migrations_dir = os.path.join(project_root, "migrations")
    if not os.path.exists(migrations_dir):
        os.makedirs(migrations_dir)
    
    # Initialize the migrations repository
    command.init(
        config=alembic_cfg,
        directory=migrations_dir,
        template="generic",
        package=False
    )
    
    # Create the versions directory
    versions_dir = os.path.join(migrations_dir, "versions")
    if not os.path.exists(versions_dir):
        os.makedirs(versions_dir)
    
    # Create an empty __init__.py file in the versions directory
    with open(os.path.join(versions_dir, "__init__.py"), "w") as f:
        f.write("# This file makes the versions directory a Python package\n")
    
    # Stamp the database with the current head
    command.stamp(alembic_cfg, "head")
    
    print("Database initialization completed successfully.")

if __name__ == "__main__":
    init_database()
