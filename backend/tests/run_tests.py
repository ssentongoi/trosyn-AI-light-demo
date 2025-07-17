"""
Instructions for running the Department Request API test suite.

This file provides detailed instructions for running and debugging the test suite.
"""

# Step 1: Make sure your model changes are applied
# - DepartmentRequest model has server_default=func.now() for updated_at
# - All relationships use selectinload in the service layer

# Step 2: Run the complete test suite
# pytest test_department_requests_complete.py -v

# Step 3: Run individual test categories
# pytest test_department_requests_complete.py::test_create_department_request_success -v
# pytest test_department_requests_complete.py::test_create_department_request_validation_errors -v
# pytest test_department_requests_complete.py::test_get_department_request_success -v

# Step 4: Debug mode with SQL logging
# To see SQL queries, set echo=True in TestDatabaseManager.__init__

# Step 5: Troubleshooting common issues
# 
# 1. MissingGreenlet errors:
#    - Check that all relationships are eagerly loaded with selectinload
#    - Verify that no lazy-loaded relationships are accessed in response serialization
#
# 2. ResponseValidationError for timestamps:
#    - Ensure model has server_default=func.now() for created_at and updated_at
#    - Check that test schemas make timestamps optional or handle None values
#
# 3. Database errors:
#    - Verify that test database is created with the latest schema
#    - Check that all required tables are created in the test database
#    - Use echo=True to see SQL queries and diagnose issues

# Step 6: Integration with existing codebase
#
# To integrate this solution with your existing codebase:
# 1. Replace your existing test router with the test_router.py implementation
# 2. Update your test database setup to use TestDatabaseManager
# 3. Replace your test schemas with the simplified versions
# 4. Update your test fixtures to use the new test_data fixture
# 5. Run the complete test suite to verify everything works

import sys
import os

def main():
    """Run the test suite with the specified options."""
    import pytest
    
    # Add arguments for different test modes
    if len(sys.argv) > 1:
        if sys.argv[1] == "create":
            pytest.main(["-v", "test_department_requests_complete.py::test_create_department_request_success"])
        elif sys.argv[1] == "validation":
            pytest.main(["-v", "test_department_requests_complete.py::test_create_department_request_validation_errors"])
        elif sys.argv[1] == "get":
            pytest.main(["-v", "test_department_requests_complete.py::test_get_department_request_success"])
        elif sys.argv[1] == "notfound":
            pytest.main(["-v", "test_department_requests_complete.py::test_get_department_request_not_found"])
        elif sys.argv[1] == "debug":
            # Enable SQL echo for debugging
            os.environ["SQL_ECHO"] = "True"
            pytest.main(["-v", "-s", "test_department_requests_complete.py"])
        else:
            print(f"Unknown test mode: {sys.argv[1]}")
            print_help()
    else:
        # Run all tests
        pytest.main(["-v", "test_department_requests_complete.py"])

def print_help():
    """Print help information."""
    print("Usage: python run_tests.py [mode]")
    print("Available modes:")
    print("  create    - Run create department request test")
    print("  validation - Run validation error tests")
    print("  get       - Run get department request test")
    print("  notfound  - Run not found test")
    print("  debug     - Run all tests with SQL echo enabled")
    print("  (no args) - Run all tests")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "help":
        print_help()
    else:
        main()
