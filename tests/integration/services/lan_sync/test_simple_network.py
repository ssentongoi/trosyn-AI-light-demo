"""Simplified test case for network fixture injection."""
import asyncio
import logging
import pytest

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

class SimpleTestNetwork:
    """A simplified test network for testing fixture injection."""
    
    def __init__(self, node_count=2):
        self.node_count = node_count
        self.nodes = {f"node-{i}": {"id": f"node-{i}", "name": f"Node {i}"} 
                     for i in range(node_count)}
        self._running = False
    
    async def start(self):
        logger.info("Starting simple test network...")
        self._running = True
        logger.info(f"Started {self.node_count} nodes")
    
    async def stop(self):
        logger.info("Stopping simple test network...")
        self._running = False
        logger.info("Test network stopped")
    
    def get_node(self, node_id):
        return self.nodes.get(node_id)

@pytest.fixture(scope="function")
async def simple_network():
    """A simplified network fixture for testing."""
    network = SimpleTestNetwork(node_count=2)
    try:
        logger.info("Setting up simple_network fixture...")
        await network.start()
        yield network
    finally:
        logger.info("Tearing down simple_network fixture...")
        await network.stop()

@pytest.mark.asyncio
async def test_simple_network(simple_network):
    """Test that the simple_network fixture is injected correctly."""
    logger.info("Running test_simple_network...")
    
    # Debug: Log the simple_network object
    logger.debug(f"simple_network type: {type(simple_network)}")
    logger.debug(f"simple_network nodes: {list(simple_network.nodes.keys())}")
    
    # Basic assertions
    assert simple_network is not None, "simple_network fixture not provided"
    assert hasattr(simple_network, 'nodes'), "simple_network has no 'nodes' attribute"
    assert len(simple_network.nodes) > 0, "simple_network has no nodes"
    
    # Test node access
    node = simple_network.get_node("node-0")
    assert node is not None, "Failed to get node-0"
    assert node["id"] == "node-0", "Incorrect node ID"
    
    logger.info("Test completed successfully")
