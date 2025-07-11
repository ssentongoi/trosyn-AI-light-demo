"""Test utilities for LAN Sync integration tests."""
import os
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import asdict
from trosyn_sync.services.lan_sync.config import LANConfig

class TestLANConfigBuilder:
    """Builder for creating test configurations."""
    
    @classmethod
    def create_test_config(
        cls,
        node_id: Optional[str] = None,
        node_name: str = "test-node",
        port: int = 0,
        node_type: str = "test",
        use_ssl: Optional[bool] = None,
        **overrides
    ) -> LANConfig:
        """Create a test configuration with sensible defaults.
        
        Args:
            node_id: Optional node ID. If None, a random one will be generated.
            node_name: Node display name.
            port: Base port number. Will use port for sync and port+1 for discovery.
            node_type: Type of node (e.g., 'admin_hub', 'child_app', 'test').
            use_ssl: Whether to enable SSL for this node. If None, uses TROSYNC_USE_SSL env var.
            **overrides: Additional configuration overrides.
            
        Returns:
            LANConfig: A configured instance for testing.
        """
        # Determine SSL setting - prioritize explicit parameter, then environment, then default to False
        if use_ssl is None:
            use_ssl = os.getenv('TROSYNC_USE_SSL', '').lower() in ('1', 'true', 'yes', 'on')
        
        # Default configuration
        default_config = {
            'node_id': node_id or f"test-{os.urandom(4).hex()}",
            'node_name': node_name,
            'node_type': node_type,
            'multicast_group': '239.255.43.21',
            'discovery_port': port + 1,
            'sync_port': port + 2,
            'file_port': port + 3,
            'use_ssl': use_ssl,  # Configurable SSL for tests
            'discovery_interval': 1,  # Faster discovery for tests
            'device_timeout': 5,  # Shorter timeout for tests
            'require_authentication': False,  # Disable auth for tests by default
            'heartbeat_interval': 5.0,  # 5 seconds between heartbeats
            'client_cleanup_interval': 10.0,  # 10 seconds between cleanups
            'capabilities': {
                'sync': True,
                'file_transfer': False,
                'model_updates': False
            }
        }
        
        # Apply overrides
        default_config.update(overrides)
        
        # Create and return the config
        config = LANConfig()
        for field, value in default_config.items():
            if hasattr(config, field):
                setattr(config, field, value)
        
        # Add sync_host for client connections
        config.sync_host = "127.0.0.1"
        
        return config

    @classmethod
    def create_server_config(
        cls,
        node_id: Optional[str] = None,
        node_name: str = "test-server",
        port: int = 0,
        use_ssl: Optional[bool] = None,
        **overrides
    ) -> LANConfig:
        """Create a server configuration with optimized test settings.
        
        Args:
            node_id: Optional node ID. If None, a random one will be generated.
            node_name: Node display name.
            port: Base port number.
            use_ssl: Whether to enable SSL for this server. If None, uses TROSYNC_USE_SSL env var.
            **overrides: Additional configuration overrides.
            
        Returns:
            LANConfig: A configured server instance for testing.
        """
        """Create a server configuration with optimized test settings."""
        return cls.create_test_config(
            node_id=node_id,
            node_name=node_name,
            port=port,
            use_ssl=use_ssl,
            **overrides
        )

    @classmethod
    def create_client_config(
        cls,
        server_config: LANConfig,
        node_id: Optional[str] = None,
        node_name: str = "test-client",
        use_ssl: Optional[bool] = None,
        **overrides
    ) -> LANConfig:
        """Create a client configuration that can connect to the given server.
        
        Args:
            server_config: The server's LANConfig to connect to.
            node_id: Optional node ID. If None, a random one will be generated.
            node_name: Node display name.
            use_ssl: Whether to enable SSL for this client. If None, uses server's SSL setting.
            **overrides: Additional configuration overrides.
            
        Returns:
            LANConfig: A configured client instance for testing.
        """
        # If use_ssl is not specified, use the same setting as the server
        if use_ssl is None:
            use_ssl = server_config.use_ssl
        """Create a client configuration that can connect to the given server."""
        return cls.create_test_config(
            node_id=node_id,
            node_name=node_name,
            port=server_config.sync_port,  # Connect to server's sync port
            use_ssl=use_ssl,
            **overrides
        )

    @classmethod
    def update_config(cls, config: LANConfig, **updates) -> LANConfig:
        """Update a config with new values."""
        for key, value in updates.items():
            if hasattr(config, key):
                setattr(config, key, value)
        return config


class SyncItemTestBuilder:
    """Builder for creating test SyncItem instances with proper typing and defaults."""
    
    @staticmethod
    def create(
        item_id: str,
        data: Dict[str, Any],
        version: int = 1,
        last_modified: Optional[datetime] = None,
        is_deleted: bool = False,
        metadata: Optional[Dict[str, Any]] = None
    ) -> 'SyncItem':
        """
        Create a properly configured SyncItem for testing.
        
        Args:
            item_id: Unique identifier for the sync item
            data: The actual data payload
            version: Version number (defaults to 1)
            last_modified: Timestamp (defaults to now)
            is_deleted: Deletion flag (defaults to False)
            metadata: Additional metadata (defaults to test metadata)
        
        Returns:
            Properly initialized SyncItem object
        """
        from trosyn_sync.services.lan_sync.sync_engine import SyncItem
        from datetime import datetime
        
        if last_modified is None:
            last_modified = datetime.utcnow()
            
        if metadata is None:
            metadata = {"created_by": "integration_test"}
            
        return SyncItem(
            id=item_id,
            data=data,
            version=version,
            last_modified=last_modified,
            is_deleted=is_deleted,
            metadata=metadata
        )
    
    @classmethod
    def create_test_batch(cls, count: int, base_id: str = "test-item") -> List['SyncItem']:
        """Create multiple test items for batch operations."""
        return [
            cls.create(
                item_id=f"{base_id}-{i}",
                data={"index": i, "value": f"test_data_{i}"},
                metadata={"batch_test": True, "index": i}
            )
            for i in range(count)
        ]
    
    @classmethod
    def create_deleted_item(cls, item_id: str, data: Dict[str, Any]) -> 'SyncItem':
        """Create a deleted sync item for deletion tests."""
        return cls.create(
            item_id=item_id,
            data=data,
            is_deleted=True,
            metadata={"test_type": "deletion_test"}
        )
