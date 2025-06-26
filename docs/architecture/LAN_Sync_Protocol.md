# Trosyn AI - LAN Sync Protocol

## 1. Overview

This document defines the communication protocol for the LAN-based synchronization between the Trosyn AI Admin Hub and the Department Nodes. The goal is to enable offline-first operation with periodic data synchronization over the local network.

## 2. Discovery Mechanism

To allow nodes to find each other on the network without prior configuration, we will use a UDP broadcast/multicast mechanism.

- **Method**: UDP Multicast
- **Multicast Group**: 239.255.255.250 (a standard address for local network service discovery)
- **Port**: 1900 (standard SSDP port)
- **Message Format**: A simple JSON object containing the node's type, IP address, and port for API communication.

**Example Discovery Packet:**
```json
{
  "type": "TROSYSN_ADMIN_HUB" | "TROSYSN_DEPT_NODE",
  "ip": "192.168.1.10",
  "port": 3000,
  "nodeId": "unique-node-identifier"
}
```

## 3. Communication Protocol

Once nodes are discovered, they will communicate via a simple RESTful API over HTTP.

- **Transport**: HTTP/1.1
- **Data Format**: JSON
- **Authentication**: JWT (JSON Web Tokens)
- **Compression**: GZIP for large payloads
- **Timeout**: 30 seconds per request

## 4. Security Considerations

### Authentication
- All API requests must include a valid JWT token in the `Authorization` header
- Tokens are issued by the Admin Hub during initial pairing
- Token expiration: 24 hours

### Data Protection
- All communications should use HTTPS where possible
- For local network communication, TLS with self-signed certificates is acceptable
- Sensitive data should be encrypted at rest

### Rate Limiting
- Maximum 10 requests per second per IP
- Implement exponential backoff for retries

## 5. Conflict Resolution

### Document Versioning
- Each document has a version vector to track changes across nodes
- Version format: `{node_id}:{sequence_number}`

### Conflict Resolution Strategy
1. **Last Write Wins (LWW)** for non-critical data
2. **Manual Resolution** for critical documents
3. **Merge** for text-based documents using operational transforms

### Conflict Detection
- Document hashes are compared during sync
- If hashes differ but versions suggest no conflict, log warning
- If versions conflict, trigger resolution workflow

## 6. Error Handling

### Error Responses
All error responses follow the format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

### Common Error Codes
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `409`: Conflict
- `429`: Too Many Requests
- `500`: Internal Server Error

### Retry Logic
- Maximum 3 retries for failed requests
- Exponential backoff starting at 1 second
- Jitter to prevent thundering herd problem

## 7. Performance Considerations

### Batch Processing
- Sync operations support batching
- Maximum batch size: 100 documents
- Batch timeout: 60 seconds

### Delta Updates
- Only transfer changed portions of documents
- Support for binary diffs for large files
- Compression for network efficiency

### Caching
- Implement ETag/If-None-Match for efficient caching
- Cache invalidation on document updates
- In-memory cache with LRU eviction policy

## 8. API Endpoints

All nodes (Admin Hub and Department Nodes) will expose the following endpoints.

### `GET /status`

- **Description**: Returns the current status of the node.
- **Response Body**:
  ```json
  {
    "status": "ok",
    "nodeType": "TROSYSN_ADMIN_HUB",
    "nodeId": "unique-node-identifier",
    "timestamp": "2023-10-27T10:00:00Z"
  }
  ```

### `GET /api/v1/documents/manifest`

- **Description**: Returns a manifest of all documents, including their IDs, versions, and hashes. This is used to determine which documents need to be synced.
- **Response Body**:
  ```json
  {
    "documents": [
      { "id": 1, "version_hash": "abc123def456...", "updated_at": "..." },
      { "id": 2, "version_hash": "ghi789jkl012...", "updated_at": "..." }
    ]
  }
  ```

### `GET /api/v1/documents/:id`

- **Description**: Retrieves the full content of a specific document.
- **Response Body**: The raw content of the document (e.g., PDF, Markdown file).

### `POST /api/v1/sync/request`

- **Description**: Initiates a synchronization request from one node to another. The receiving node will then use the manifest to pull any missing or outdated documents.
- **Request Body**:
  ```json
  {
    "sourceNodeId": "requesting-node-id",
    "sourceApiUrl": "http://192.168.1.11:3000",
    "lastSyncTime": "2023-10-27T10:00:00Z",
    "documentFilter": {
      "types": ["document", "spreadsheet"],
      "modifiedAfter": "2023-10-20T00:00:00Z"
    }
  }
  ```
- **Response**: 
  ```json
  {
    "syncId": "sync-1234",
    "statusUrl": "/api/v1/sync/status/sync-1234",
    "estimatedTimeRemaining": 30
  }
  ```
- **Status Codes**:
  - `202 Accepted`: Sync request received and queued
  - `400 Bad Request`: Invalid request parameters
  - `401 Unauthorized`: Missing or invalid authentication
  - `429 Too Many Requests`: Rate limit exceeded

## 9. Implementation Details

### Node Types
1. **Admin Hub**
   - Central authority for authentication
   - Maintains master copy of all documents
   - Coordinates sync between department nodes

2. **Department Node**
   - Connects to Admin Hub for initial setup
   - Operates independently when offline
   - Syncs changes when connection is available

### Data Flow
1. Node starts up and broadcasts presence
2. Discovers other nodes via multicast
3. Authenticates with Admin Hub
4. Exchanges document manifests
5. Synchronizes documents based on version vectors

### Storage
- SQLite for metadata and small documents
- File system for large binary files
- Immutable document history with garbage collection

## 10. Testing Strategy

### Unit Tests
- Test document versioning logic
- Verify conflict resolution algorithms
- Validate authentication flows

### Integration Tests
- Test node discovery
- Verify document synchronization
- Test offline behavior

### Performance Testing
- Measure sync times with large document sets
- Test network interruption handling
- Benchmark under high load

### Security Testing
- Penetration testing
- Fuzz testing of API endpoints
- Authentication bypass attempts
