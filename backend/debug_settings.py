import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))
print(f"Python path: {sys.path}")

# Print current working directory
print(f"Current working directory: {os.getcwd()}")

# Print environment variables
print("\nEnvironment variables:")
for key in ["PYTHONPATH", "SECRET_KEY", "REFRESH_SECRET_KEY", "DATABASE_URL"]:
    print(f"{key}: {os.environ.get(key, 'Not set')}")

# Try to import settings
try:
    print("\nAttempting to import settings...")
    from app.core.config import settings

    print("Successfully imported settings!")

    # Print settings
    print("\nSettings values:")
    for attr in [
        "SECRET_KEY",
        "REFRESH_SECRET_KEY",
        "ALGORITHM",
        "ACCESS_TOKEN_EXPIRE_MINUTES",
        "REFRESH_TOKEN_EXPIRE_DAYS",
        "DATABASE_URL",
        "BACKEND_CORS_ORIGINS",
    ]:
        try:
            value = getattr(settings, attr, "Not found")
            print(f"{attr}: {value}")
        except Exception as e:
            print(f"Error accessing {attr}: {e}")

except Exception as e:
    print(f"Error importing settings: {e}")
    import traceback

    traceback.print_exc()

# Try to import security module
try:
    print("\nAttempting to import security module...")
    from app.core import security

    print("Successfully imported security module!")
except Exception as e:
    print(f"Error importing security module: {e}")
    import traceback

    traceback.print_exc()
