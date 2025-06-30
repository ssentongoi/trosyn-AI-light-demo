"""
Pytest configuration for LAN sync integration tests.
"""
import asyncio
import logging
import os
import sys
from pathlib import Path

import pytest
from _pytest.fixtures import FixtureRequest

# Add the project root to the Python path
project_root = Path(__file__).parent.parent.parent.parent.parent
sys.path.insert(0, str(project_root))

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# Import test utilities using relative imports
from .test_multi_node_sync import TestNetwork, NODE_COUNT

# Fixtures
@pytest.fixture(scope="function")
async def test_network():
    """Create a test network with multiple nodes for testing.
    
    This fixture creates a fresh test network for each test function.
    """
    logger.info("Setting up test network...")
    network = None
    
    try:
        # Create network
        network = TestNetwork(node_count=NODE_COUNT)
        
        # Create nodes
        for i in range(NODE_COUNT):
            node_id = f"test-node-{i}"
            node_name = f"Test Node {i}"
            # First node is an admin hub, others are child apps
            node_type = "admin_hub" if i == 0 else "child_app"
            logger.info(f"Creating {node_type} node: {node_id}")
            await network.create_node(node_id, node_name, node_type=node_type)
        
        # Start the network
        logger.info("Starting test network...")
        await network.start()
        
        # Give nodes time to discover each other and initialize
        logger.info("Waiting for nodes to discover each other...")
        await asyncio.sleep(1.0)
        
        # Verify all nodes are ready
        for node_id, node in network.nodes.items():
            assert node["env"].is_running, f"Node {node_id} failed to start"
        
        logger.info("Test network started successfully")
        
        # Yield the network to the test
        yield network
        
    except Exception as e:
        logger.error(f"Error setting up test network: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise
    finally:
        # Clean up
        if network is not None:
            logger.info("Tearing down test network...")
            try:
                await network.stop()
            except Exception as e:
                logger.error(f"Error during test network cleanup: {e}")
                logger.error(traceback.format_exc())
            finally:
                # Ensure we don't try to use the network after cleanup
                network = None
