"""
LAN Sync Configuration.

Configuration settings for the LAN synchronization service.
"""
import os
import ssl
from dataclasses import dataclass, field
from typing import Any, Dict, Optional, Union, Tuple, List

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
    connect_timeout: float = 30.0  # seconds to wait for connection to be established
    
    # Discovery settings
    discovery_interval: int = 30  # seconds
    device_timeout: int = 90  # seconds before considering a device offline
    
    # Heartbeat settings
    heartbeat_interval: int = 30  # seconds between heartbeats
    heartbeat_timeout: int = 10  # seconds to wait for heartbeat response
    max_missed_heartbeats: int = 3  # number of missed heartbeats before considering connection dead
    
    # Security
    require_authentication: bool = True
    shared_secret: Optional[str] = None
    ssl_context: Optional[ssl.SSLContext] = None
    ssl_certfile: Optional[str] = None
    ssl_keyfile: Optional[str] = None
    ssl_ca_certs: Optional[Union[str, List[str]]] = None
    ssl_ciphers: str = "DEFAULT"
    ssl_verify_mode: int = ssl.CERT_REQUIRED
    ssl_check_hostname: bool = True
    ssl_password: Optional[str] = None
    
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
            "capabilities": self.capabilities,
            "use_ssl": self.use_ssl,
            "ssl_certfile": self.ssl_certfile,
            "ssl_keyfile": self.ssl_keyfile,
            "ssl_ca_certs": self.ssl_ca_certs,
            "ssl_ciphers": self.ssl_ciphers,
            "ssl_verify_mode": self.ssl_verify_mode,
            "ssl_check_hostname": self.ssl_check_hostname,
            "heartbeat_interval": self.heartbeat_interval,
            "heartbeat_timeout": self.heartbeat_timeout,
            "max_missed_heartbeats": self.max_missed_heartbeats
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'LANConfig':
        """Create config from dictionary."""
        return cls(**data)
    
    def create_ssl_context(self, server_side: bool = False) -> ssl.SSLContext:
        """Create and configure an SSL context.
        
        Args:
            server_side: Whether to create a server-side SSL context.
            
        Returns:
            Configured SSLContext instance.
        """
        if not self.use_ssl:
            return None
            
        ssl_context = ssl.create_default_context(
            ssl.Purpose.CLIENT_AUTH if server_side else ssl.Purpose.SERVER_AUTH
        )
        
        # Configure verification
        ssl_context.verify_mode = self.ssl_verify_mode
        ssl_context.check_hostname = self.ssl_check_hostname
        
        # Load certificates if provided
        if server_side:
            if self.ssl_certfile and self.ssl_keyfile:
                ssl_context.load_cert_chain(
                    certfile=self.ssl_certfile,
                    keyfile=self.ssl_keyfile,
                    password=self.ssl_password
                )
        
        # Load CA certificates
        if self.ssl_ca_certs:
            if isinstance(self.ssl_ca_certs, (list, tuple)):
                for ca_cert in self.ssl_ca_certs:
                    ssl_context.load_verify_locations(cafile=ca_cert)
            else:
                ssl_context.load_verify_locations(cafile=self.ssl_ca_certs)
        
        # Set ciphers
        if self.ssl_ciphers and self.ssl_ciphers != "DEFAULT":
            ssl_context.set_ciphers(self.ssl_ciphers)
        
        # Set minimum protocol version to TLS 1.2
        ssl_context.minimum_version = ssl.TLSVersion.TLSv1_2
        
        return ssl_context
    
    @classmethod
    def from_settings(cls) -> 'LANConfig':
        """Create config from application settings."""
        config = cls(
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
            use_ssl=settings.get("LAN_USE_SSL", True),
            ssl_certfile=settings.get("LAN_SSL_CERTFILE"),
            ssl_keyfile=settings.get("LAN_SSL_KEYFILE"),
            ssl_ca_certs=settings.get("LAN_SSL_CA_CERTS"),
            ssl_ciphers=settings.get("LAN_SSL_CIPHERS", "DEFAULT"),
            ssl_verify_mode=getattr(ssl, settings.get("LAN_SSL_VERIFY_MODE", "CERT_REQUIRED"), ssl.CERT_REQUIRED),
            ssl_check_hostname=settings.get("LAN_SSL_CHECK_HOSTNAME", True),
            ssl_password=settings.get("LAN_SSL_PASSWORD"),
            capabilities=settings.get("LAN_CAPABILITIES", {
                "sync": True,
                "file_transfer": True,
                "model_updates": True
            })
        )
        
        # Create SSL context if SSL is enabled
        if config.use_ssl:
            config.ssl_context = config.create_ssl_context(server_side=True)
            
        return config

# Default configuration
default_config = LANConfig()
