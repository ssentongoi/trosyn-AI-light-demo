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

## 4. API Endpoints

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
    "sourceApiUrl": "http://192.168.1.11:3000"
  }
  ```
- **Response**: `202 Accepted`
