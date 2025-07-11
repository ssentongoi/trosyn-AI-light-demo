"""
Script to generate a new database migration.
"""
import os
import sys
from alembic.config import Config
from alembic import command

def generate_migration(message: str):
    """Generate a new database migration.
    
    Args:
        message: A short description of the migration
    """
    # Get the project root directory
    project_root = os.path.dirname(os.path.abspath(__file__))
    
    # Set up the Alembic configuration
    alembic_cfg = Config(os.path.join(project_root, "alembic.ini"))
    
    # Generate the migration
    command.revision(
        config=alembic_cfg,
        autogenerate=True,
        message=message,
        rev_id=None,
        version_path=None,
        head="head",
        splice=False,
        branch_label=None,
        version_path_separator=":"
    )
    
    print("Migration generated successfully.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        message = " ".join(sys.argv[1:])
    else:
        message = "Auto-generated migration"
    
    generate_migration(message)
