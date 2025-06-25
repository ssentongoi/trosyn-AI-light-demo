# Import all models here to ensure they are registered with SQLAlchemy
# Note: We don't import Base here to avoid circular imports
from .user import User
from .company import Company
from .department import Department

__all__ = ["User", "Company", "Department"]