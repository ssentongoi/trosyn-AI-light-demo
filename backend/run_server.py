#!/usr/bin/env python3
"""
Wrapper script to ensure proper environment setup before starting the FastAPI server.
This helps with import timing issues in the uvicorn context.
"""
import os
import sys
from pathlib import Path

# Set up the Python path
backend_dir = Path(__file__).parent
project_root = backend_dir.parent

# Add the backend directory to Python path
sys.path.insert(0, str(backend_dir))

# Load environment variables before importing anything else
from dotenv import load_dotenv

load_dotenv(backend_dir / ".env")

# Verify environment variables are loaded
print("\n=== Environment Variables ===")
for var in ["SECRET_KEY", "REFRESH_SECRET_KEY", "DATABASE_URL"]:
    print(f"{var}: {'*' * 8 if 'SECRET' in var else os.getenv(var, 'Not set')}")

# Now import the FastAPI app
print("\n=== Importing FastAPI app ===")
from app.main import app as fastapi_app

# For uvicorn to pick up the app
app = fastapi_app

if __name__ == "__main__":
    import uvicorn

    print("\n=== Starting Uvicorn server ===")
    uvicorn.run("run_server:app", host="0.0.0.0", port=8000, reload=True)
