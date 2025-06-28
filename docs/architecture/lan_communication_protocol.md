# LAN Communication Protocol Specification

## Overview
This document outlines the communication protocol for LAN-based synchronization between the Trosyn AI Admin Hub and Child Apps.

## Protocol Stack
- **Transport Layer**: TCP for reliable data transfer, UDP for discovery
- **Application Protocol**: Custom JSON-based protocol over TCP
- **Ports**:
  - Discovery: UDP/5000 (configurable)
  - Main Communication: TCP/5001 (configurable)
  - File Transfer: TCP/5002 (configurable)

## Message Format
All messages are JSON objects with the following structure:

```json
{
  "version": "1.0",
  "message_id": "uuid-v4",
  "timestamp": "ISO-8601 timestamp",
  "source": {
    "node_id": "unique-node-identifier",
    "node_name": "human-readable-name"
  },
  "type": "message-type",
  "payload": {},
  "signature": "HMAC-SHA256"
}
```

## Message Types

### 1. Discovery Messages (UDP Multicast)
- **DISCOVERY_BROADCAST**: Sent by clients to discover available hubs
- **DISCOVERY_RESPONSE**: Sent by hubs in response to discovery requests

### 2. Authentication Messages (TCP)
- **AUTH_REQUEST**: Client requests authentication
- **AUTH_RESPONSE**: Server responds with authentication result
- **AUTH_CHALLENGE**: Challenge for mutual authentication

### 3. Synchronization Messages (TCP)
- **SYNC_REQUEST**: Request to start synchronization
- **SYNC_DATA**: Contains synchronization data
- **SYNC_ACK**: Acknowledgment of received data
- **SYNC_COMPLETE**: Indicates end of synchronization

### 4. Heartbeat Messages (UDP)
- **HEARTBEAT**: Periodic message to confirm node availability

## Security

### Encryption
- All TCP communication uses TLS 1.3
- UDP discovery messages are signed but not encrypted (for performance)
- File transfers use AES-256-GCM encryption

### Authentication
1. Initial handshake using pre-shared keys (PSK) or certificate-based
2. Session tokens for subsequent communications
3. Mutual authentication required for all critical operations

### Message Signing
- All messages include an HMAC-SHA256 signature
- Signature covers all message fields except the signature itself
- Uses a rotating session key derived during authentication

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Common Error Codes
- `AUTH_REQUIRED`: Authentication required
- `INVALID_TOKEN`: Invalid or expired authentication token
- `ACCESS_DENIED`: Insufficient permissions
- `INVALID_REQUEST`: Malformed request
- `INTERNAL_ERROR`: Server-side error

## Implementation Notes

### Time Synchronization
- All timestamps should be in UTC and ISO-8601 format
- Clock skew should be checked during authentication
- NTP synchronization is recommended for all nodes

### Message Size Limits
- UDP messages: 512 bytes maximum
- TCP messages: 1MB maximum (configurable)
- Large files should be transferred using the file transfer protocol

### Retry Logic
- Failed TCP operations should implement exponential backoff
- Maximum of 3 retries before considering the connection failed
- Failed UDP messages may be retried with jitter

## Example Flows

### Discovery Flow
1. Client sends `DISCOVERY_BROADCAST` to multicast address
2. Hubs respond with `DISCOVERY_RESPONSE` containing their connection details
3. Client selects a hub and initiates TCP connection

### Authentication Flow
1. Client connects to hub via TCP
2. Hub sends `AUTH_CHALLENGE`
3. Client responds with `AUTH_REQUEST` containing credentials
4. Hub responds with `AUTH_RESPONSE` containing session token

### Synchronization Flow
1. Client sends `SYNC_REQUEST` with sync parameters
2. Hub responds with `SYNC_DATA` messages
3. Client acknowledges with `SYNC_ACK`
4. Hub sends `SYNC_COMPLETE` when done
