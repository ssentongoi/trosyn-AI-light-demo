"""
Debug script to test database setup outside of pytest.
"""
import os
import sys
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import Base and only the models needed for department request tests
from app.db.base import Base

# Import only the models we need for department request tests
from app.models.company import Company
from app.models.department import Department
from app.models.department_request import (
    DepartmentRequest, 
    RequestComment, 
    RequestAttachment, 
    RequestHistory
)

# Create a minimal User model to avoid relationship issues
from sqlalchemy import Boolean, Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

class MinimalUser(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    
    # Foreign keys
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)

# Set up test database
test_db_path = os.path.join(os.path.dirname(__file__), "test_debug.sqlite")
if os.path.exists(test_db_path):
    os.remove(test_db_path)
print(f"Using test database at: {test_db_path}")

# Create test engine
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{test_db_path}"
engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=True,
    future=True,
    poolclass=NullPool,
    connect_args={"check_same_thread": False}
)

# Create test session
async_session_maker = sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def setup_db():
    """Set up the database and create tables."""
    try:
        print("Creating database tables...")
        async with engine.begin() as conn:
            # Enable foreign keys for SQLite
            await conn.execute(text("PRAGMA foreign_keys=ON"))
            
            # Drop and recreate all tables
            print("Dropping all tables...")
            await conn.run_sync(Base.metadata.drop_all)
            print("Creating all tables...")
            await conn.run_sync(Base.metadata.create_all)
            
            # Verify tables were created
            result = await conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
            tables = [row[0] for row in result.fetchall()]
            print(f"Created tables: {tables}")
            
            # Verify specific tables exist
            expected_tables = ['companies', 'users', 'departments', 'department_requests']
            for table in expected_tables:
                if table not in tables:
                    print(f"WARNING: Expected table '{table}' was not created!")
                else:
                    print(f"Table '{table}' was created successfully.")
    except Exception as e:
        print(f"Error in setup_db: {e}")
        raise

async def create_test_data():
    """Create test data in the database."""
    try:
        print("Creating test data...")
        async with async_session_maker() as session:
            # Verify tables exist
            result = await session.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
            tables = [row[0] for row in result.fetchall()]
            print(f"Available tables before test data creation: {tables}")
            
            # Check if companies table exists
            if 'companies' not in tables:
                print("ERROR: 'companies' table does not exist! Cannot create test data.")
                return
            
            # Create test data
            from app.models.company import Company
            print("Creating company...")
            company = Company(name="Test Company", is_active=True)
            session.add(company)
            await session.commit()
            print(f"Company created with ID: {company.id}")
            
            # Create department
            from app.models.department import Department
            print("Creating department...")
            department = Department(name="Test Department", company_id=company.id, is_active=True)
            session.add(department)
            await session.commit()
            print(f"Department created with ID: {department.id}")
            
            # Create user with our minimal model
            print("Creating user...")
            user = MinimalUser(
                email="test@example.com",
                username="testuser",
                hashed_password="hashed_password_for_testing",
                is_active=True,
                is_superuser=False,
                company_id=company.id
            )
            session.add(user)
            await session.commit()
            print(f"User created with ID: {user.id}")
            
            print("Test data creation completed successfully!")
    except Exception as e:
        print(f"Error in create_test_data: {e}")
        raise

async def main():
    """Main function to run the debug script."""
    print("Starting database setup debug...")
    await setup_db()
    await create_test_data()
    print("Database setup debug completed!")

if __name__ == "__main__":
    asyncio.run(main())
