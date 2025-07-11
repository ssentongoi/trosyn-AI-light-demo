import sys
import os
from pathlib import Path

# Set up the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Load environment variables before importing anything else
from dotenv import load_dotenv
load_dotenv(backend_dir / '.env')

# Now import the settings
from app.core.config import settings

def test_settings():
    print("\n=== Testing Settings ===")
    print(f"PYTHONPATH: {os.environ.get('PYTHONPATH', 'Not set')}")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Backend directory: {backend_dir}")
    print(f"Environment file: {backend_dir / '.env'}")
    
    # Print environment variables
    print("\nEnvironment variables:")
    for key in ["SECRET_KEY", "REFRESH_SECRET_KEY", "DATABASE_URL"]:
        print(f"{key}: {os.environ.get(key, 'Not set')}")
    
    # Print settings
    print("\nSettings values:")
    for attr in ["SECRET_KEY", "REFRESH_SECRET_KEY", "ALGORITHM", 
                 "ACCESS_TOKEN_EXPIRE_MINUTES", "REFRESH_TOKEN_EXPIRE_DAYS",
                 "DATABASE_URL", "BACKEND_CORS_ORIGINS"]:
        try:
            value = getattr(settings, attr, 'Not found')
            print(f"{attr}: {value}")
        except Exception as e:
            print(f"Error accessing {attr}: {e}")

if __name__ == "__main__":
    test_settings()
