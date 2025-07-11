"""Minimal test case to verify pytest-asyncio fixture injection."""
import asyncio
import logging
import pytest

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

@pytest.fixture(scope="function")
async def simple_fixture():
    """A simple async fixture for testing."""
    logger.info("Setting up simple_fixture...")
    yield "fixture_value"
    logger.info("Tearing down simple_fixture...")

@pytest.mark.asyncio
async def test_simple_fixture(simple_fixture):
    """Test that the simple_fixture is injected correctly."""
    logger.info("Running test_simple_fixture...")
    assert simple_fixture == "fixture_value"
    logger.info("Test completed successfully")
