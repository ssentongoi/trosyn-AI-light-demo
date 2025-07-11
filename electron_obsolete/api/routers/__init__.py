"""
API routers for the Trosyn AI application.

This module contains all the API route handlers organized by functionality.
"""

# Import all routers
from . import documents

# List of all routers to be included in the main FastAPI app
__all__ = ["documents"]
