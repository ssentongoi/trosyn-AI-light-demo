import os
import sys
from pathlib import Path

# Add the parent directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

# Now import the settings
from app.core.config import settings


def print_settings():
    print("\n=== Current Settings ===")
    print(f"SECRET_KEY: {settings.SECRET_KEY}")
    print(f"REFRESH_SECRET_KEY: {settings.REFRESH_SECRET_KEY}")
    print(f"ALGORITHM: {settings.ALGORITHM}")
    print(f"ACCESS_TOKEN_EXPIRE_MINUTES: {settings.ACCESS_TOKEN_EXPIRE_MINUTES}")
    print(f"REFRESH_TOKEN_EXPIRE_DAYS: {settings.REFRESH_TOKEN_EXPIRE_DAYS}")
    print(f"DATABASE_URL: {settings.DATABASE_URL}")
    print(f"BACKEND_CORS_ORIGINS: {settings.BACKEND_CORS_ORIGINS}")
    print("======================\n")


if __name__ == "__main__":
    # Print environment variables for debugging
    print("Environment variables:")
    for key in ["SECRET_KEY", "REFRESH_SECRET_KEY", "DATABASE_URL"]:
        print(f"{key}: {os.environ.get(key, 'Not set')}")

    # Print settings
    print_settings()

    # Try to access the settings through the security module
    try:
        from app.core import security

        print("Successfully imported security module")
    except Exception as e:
        print(f"Error importing security module: {e}")
        raise
