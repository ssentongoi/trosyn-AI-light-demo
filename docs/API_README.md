# Trosyn AI API

This is the API server for Trosyn AI, providing access to the Gemma 3N language model and distributed synchronization capabilities.

## Features

- Text completion with `/v1/completions`
- Chat completion with `/v1/chat/completions`
- Model information with `/v1/models`
- Health check with `/health`
- **LAN Synchronization**: Distributed sync across multiple nodes
  - Conflict resolution with last-write-wins strategy
  - Secure authentication and replay attack prevention
  - Offline support with automatic sync on reconnection
  - Delta synchronization to minimize network traffic

## Prerequisites

- Python 3.8+
- pip
- Virtual environment (recommended)

## Setup

1. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements-api.txt
   ```

3. Download the Gemma 3N model (GGUF format) and place it in the `models/` directory.

## Configuration

### Environment Variables

#### LLM Configuration
- `LLM_MODEL_PATH`: Path to the model file (default: `models/gemma-3n-e2b.gguf`)
- `LLM_CONTEXT_SIZE`: Context window size (default: 2048)
- `LLM_N_GPU_LAYERS`: Number of layers to offload to GPU (default: 0)

#### LAN Sync Configuration
- `LAN_SYNC_ENABLED`: Enable/disable LAN sync (default: `true`)
- `LAN_SYNC_PORT`: Port for LAN sync server (default: `5000`)
- `LAN_SYNC_NODE_ID`: Unique identifier for this node (auto-generated if not set)
- `LAN_SYNC_NODE_NAME`: Human-readable name for this node (default: hostname)
- `LAN_SYNC_DISCOVERY_INTERVAL`: How often to broadcast discovery packets (seconds, default: `30`)
- `LAN_SYNC_DEVICE_TIMEOUT`: How long to wait before considering a device offline (seconds, default: `90`)

## Conflict Resolution

Trosyn AI implements a robust conflict resolution strategy for handling concurrent modifications across multiple nodes:

### Last-Write-Wins (LWW)
- When the same item is modified on different nodes, the version with the most recent timestamp is kept
- Timestamps use microsecond precision and are synchronized across nodes using NTP
- The system maintains a version history of changes for audit purposes

### Conflict Detection
- Each modification increments the item's version number
- The system detects conflicts by comparing version numbers and timestamps
- Conflicts are logged for administrative review

### Handling Deletions
- When a deleted item is modified on another node, the deletion takes precedence
- The system preserves tombstone records for a configurable period
- Administrators can recover deleted items from version history

### Custom Conflict Resolution
Advanced users can implement custom conflict resolution strategies by:
1. Subclassing `SyncEngine` and overriding the `_resolve_conflict` method
2. Implementing their own merge logic based on item type and business rules
3. Registering the custom engine with the LAN sync service

Example custom conflict resolution:

```python
class CustomSyncEngine(SyncEngine):
    async def _resolve_conflict(self, local_item, remote_item):
        # Custom merge logic here
        if local_item.type == 'document' and remote_item.type == 'document':
            # Merge document content
            merged_content = f"{local_item.content}\n---\n{remote_item.content}"
            return SyncItem(
                id=local_item.id,
                type=local_item.type,
                data={"content": merged_content},
                version=max(local_item.version, remote_item.version) + 1,
                timestamp=max(local_item.timestamp, remote_item.timestamp),
                node_id=self.node_id
            )
        # Fall back to default resolution
        return await super()._resolve_conflict(local_item, remote_item)
```

## Security

Trosyn AI implements several security measures to protect your data during synchronization:

### Authentication
- **Node Authentication**: Each node must authenticate using a shared secret
- **Challenge-Response**: Prevents replay attacks using nonces and timestamps
- **Session Tokens**: Short-lived tokens for authenticated sessions

### Data Protection
- **End-to-End Encryption**: All sync data is encrypted using AES-256-GCM
- **Message Signing**: All messages are signed using HMAC-SHA256
- **Perfect Forward Secrecy**: Ephemeral keys for each session

### Network Security
- **TLS Support**: Encrypted communication channels (when SSL is enabled)
- **Firewall-Friendly**: Works across NAT and firewalls with minimal configuration
- **Rate Limiting**: Prevents brute force and denial of service attacks

### Security Best Practices
1. **Change Default Credentials**: Always change the default shared secret
2. **Enable TLS**: Use SSL/TLS for production deployments
3. **Regular Updates**: Keep the software up to date with the latest security patches
4. **Network Segmentation**: Limit sync traffic to trusted network segments
5. **Monitor Logs**: Regularly review sync logs for suspicious activity

## Running the API

```bash
./run_api.sh
```

Or directly with uvicorn:

```bash
uvicorn src.api.main:app --reload
```

The API will be available at `http://localhost:8000`

## API Documentation

Once running, visit:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Example Requests

### Text Completion

```bash
curl -X POST "http://localhost:8000/v1/completions" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain quantum computing in simple terms"}'
```

### Chat Completion

```bash
curl -X POST "http://localhost:8000/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

### List Models

```bash
curl http://localhost:8000/v1/models
```

## Development

### Running Tests

```bash
pytest
```

### Linting

```bash
flake8 src/
```

## License

MIT
