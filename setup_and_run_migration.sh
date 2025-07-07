#!/bin/bash

# Navigate to the project root
cd "$(dirname "$0")"

# Create a virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate the virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install required packages
echo "Installing required packages..."
pip install --upgrade pip
pip install alembic sqlalchemy

# Check if requirements-api.txt exists and install dependencies
if [ -f "requirements-api.txt" ]; then
    echo "Installing project dependencies..."
    pip install -r requirements-api.txt
fi

# Run the initialization script
echo "Initializing database..."
python init_db.py

# Run the migration
echo "Running migration..."
python create_sync_sessions_migration.py

echo "Migration completed successfully!"
echo "Don't forget to activate the virtual environment with 'source venv/bin/activate'"
