"""
LAN Sync Configuration.

Configuration settings for the LAN synchronization service.
"""
import os
from dataclasses import dataclass, field
from typing import Any, Dict, Optional

# Import settings with fallback to avoid circular imports
try:
    from trosyn_sync.config import settings
except ImportError:
    # Fallback for when running tests directly
    import os
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
    from trosyn_sync.config import settings

@dataclass
class LANConfig:
    """Configuration for LAN sync service."""
    # Network settings
    multicast_group: str = "239.255.43.21"
    discovery_port: int = 5000
    sync_port: int = 5001
    use_ssl: bool = True
    file_port: int = 5002
    
    # Discovery settings
    discovery_interval: int = 30  # seconds
    device_timeout: int = 90  # seconds before considering a device offline
    
    # Security
    require_authentication: bool = True
    shared_secret: Optional[str] = None
    
    # Node identification
    node_id: str = field(default_factory=lambda: os.urandom(16).hex())
    node_name: str = "trosyn-node"
    
    # Capabilities
    capabilities: Dict[str, Any] = field(default_factory=lambda: {
        "sync": True,
        "file_transfer": True,
        "model_updates": True
    })
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary."""
        return {
            "multicast_group": self.multicast_group,
            "discovery_port": self.discovery_port,
            "sync_port": self.sync_port,
            "file_port": self.file_port,
            "discovery_interval": self.discovery_interval,
            "device_timeout": self.device_timeout,
            "require_authentication": self.require_authentication,
            "node_id": self.node_id,
            "node_name": self.node_name,
            "capabilities": self.capabilities
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'LANConfig':
        """Create config from dictionary."""
        return cls(**data)
    
    @classmethod
    def from_settings(cls) -> 'LANConfig':
        """Create config from application settings."""
        return cls(
            multicast_group=settings.get("LAN_MULTICAST_GROUP", "239.255.43.21"),
            discovery_port=settings.get("LAN_DISCOVERY_PORT", 5000),
            sync_port=settings.get("LAN_SYNC_PORT", 5001),
            file_port=settings.get("LAN_FILE_PORT", 5002),
            discovery_interval=settings.get("LAN_DISCOVERY_INTERVAL", 30),
            device_timeout=settings.get("LAN_DEVICE_TIMEOUT", 90),
            require_authentication=settings.get("LAN_REQUIRE_AUTH", True),
            shared_secret=settings.get("LAN_SHARED_SECRET"),
            node_id=settings.get("LAN_NODE_ID") or os.urandom(16).hex(),
            node_name=settings.get("LAN_NODE_NAME", "trosyn-node"),
            capabilities=settings.get("LAN_CAPABILITIES", {
                "sync": True,
                "file_transfer": True,
                "model_updates": True
            })
        )

# Default configuration
default_config = LANConfig()
