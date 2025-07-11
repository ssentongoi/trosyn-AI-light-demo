"""Discovery service module for Trosyn Sync."""

from .service import DiscoveryService

# Create a singleton instance of the discovery service
_discovery_service = DiscoveryService()

def get_discovery_service() -> DiscoveryService:
    """Get the singleton instance of the discovery service."""
    return _discovery_service