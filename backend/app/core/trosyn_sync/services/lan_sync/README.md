# LAN Sync Module

A secure, efficient, and reliable TCP-based synchronization protocol for peer-to-peer communication in the Trosyn AI system.

## Features

- **Secure Communication**: End-to-end encryption and message signing
- **Peer Discovery**: Automatic discovery of peers on the local network
- **Reliable Messaging**: Guaranteed message delivery with acknowledgments
- **Authentication**: Secure authentication mechanism
- **Efficient**: Optimized for both small and large data transfers
- **Extensible**: Easy to add new message types and handlers

## Architecture

The LAN sync module consists of several key components:

1. **Protocol Handler**: Manages message serialization, signing, and validation
2. **TCP Server**: Handles incoming connections and routes messages
3. **TCP Client**: Manages outgoing connections and message sending
4. **Discovery Service**: Discovers other nodes on the local network
5. **Security Manager**: Handles encryption, decryption, and key management

## Message Types

The protocol supports the following message types:

| Type | Description |
|------|-------------|
| `AUTH_REQUEST` | Authentication request |
| `AUTH_RESPONSE` | Authentication response |
| `SYNC_REQUEST` | Request to sync data |
| `SYNC_RESPONSE` | Response to sync request |
| `HEARTBEAT` | Keep-alive message |
| `ERROR` | Error response |

## Getting Started

### Prerequisites

- Python 3.8+
- `cryptography` package for security features
- `netifaces` for network interface detection

### Installation

```bash
pip install -r requirements.txt
```

### Basic Usage

#### Starting a Server

```python
from trosyn_sync.services.lan_sync import (
    LANConfig, ProtocolHandler, TCPSyncServer
)

# Create configuration
config = LANConfig(
    node_id="node-1",
    node_name="My Node",
    sync_port=5000,
    use_ssl=True,
    require_authentication=True
)

# Create protocol handler
handler = ProtocolHandler(
    node_id=config.node_id,
    node_name=config.node_name,
    secret_key=b"your-32-byte-secret-key"
)

# Create and start server
server = TCPSyncServer(
    config=config,
    handler=handler,
    auth_middleware=auth_middleware  # Your authentication function
)

await server.start()
```

#### Creating a Client

```python
from trosyn_sync.services.lan_sync import (
    LANConfig, ProtocolHandler, TCPSyncClient
)

# Create configuration
config = LANConfig(
    node_id="client-1",
    node_name="My Client"
)

# Create protocol handler
handler = ProtocolHandler(
    node_id=config.node_id,
    node_name=config.node_name,
    secret_key=b"your-32-byte-secret-key"
)

# Create and connect client
client = TCPSyncClient(config, handler)
await client.connect("127.0.0.1", 5000)

# Authenticate (if required)
auth_msg = handler.create_message(
    MessageType.AUTH_REQUEST,
    {"token": "your-auth-token"},
    sign=True
)
auth_response = await client.send_message(auth_msg, wait_for_response=True)

# Send a sync request
sync_msg = handler.create_message(
    MessageType.SYNC_REQUEST,
    {"data": "Hello, world!"},
    sign=True
)
response = await client.send_message(sync_msg, wait_for_response=True)
```

### Authentication

To implement custom authentication, provide an `auth_middleware` function when creating the server:

```python
async def auth_middleware(message: Message) -> tuple[bool, Optional[Dict[str, Any]]]:
    """
    Authenticate a message.
    
    Args:
        message: The message to authenticate
        
    Returns:
        tuple: (is_authenticated, auth_data)
    """
    if message.payload.get("token") == "valid-token":
        return True, {"user_id": "user-123"}
    return False, None
```

### Message Handlers

To handle different message types, register message handlers:

```python
@server.message_handler(MessageType.SYNC_REQUEST)
async def handle_sync_request(message: Message, client_id: str) -> Optional[Message]:
    """Handle sync request messages."""
    print(f"Received sync request: {message.payload}")
    
    # Create response
    response = server.handler.create_message(
        MessageType.SYNC_RESPONSE,
        {"status": "success", "data": "Processed"}
    )
    return response
```

## Security

The LAN sync module includes several security features:

1. **Message Signing**: All messages are signed to ensure integrity
2. **Replay Protection**: Nonces prevent replay attacks
3. **Message Expiration**: Messages expire after a configurable TTL
4. **Optional SSL/TLS**: For encrypted communication
5. **Authentication**: Custom authentication middleware

## Performance

The module is optimized for performance:

- Asynchronous I/O for high concurrency
- Efficient binary protocol
- Minimal memory overhead
- Configurable timeouts and retries

## Testing

Run the test suite:

```bash
pytest tests/lan_sync/
```

To run performance tests:

```bash
pytest tests/lan_sync/performance/ -v -m "performance"
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
