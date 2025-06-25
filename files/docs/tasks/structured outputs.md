# Create structured outputs for:
# 1. Trea IDE documentation note
# 2. Developer documentation for setup
# 3. Code comment version for integration

# 1. Trea IDE doc block
trea_doc = {
    "title": "Sync System Overview (Company Hub & Superadmin)",
    "description": "Describes how sync works between child devices, company hub, and the superadmin dashboard in Trosyn AI.",
    "details": [
        "Child devices sync locally to the company hub over LAN. No internet required.",
        "Company hub syncs to the Superadmin server *only* when a local admin user manually triggers a sync by going online.",
        "Sync includes metadata only — no user files or assistant memory leave the hub.",
        "Superadmin uses the metadata to verify token status, payment, and enforce offline time limits.",
        "Hub processes server response (OK, Soft lock, Token Update) and applies it locally."
    ]
}

# 2. Developer documentation
developer_doc = """
# Trosyn AI: Sync System Implementation

## Overview
The Trosyn system supports offline-first operation with lightweight sync to a central superadmin server. Child devices never touch the internet.

## Sync Architecture

- **Child → Hub (LAN only):**
  - Automatic local sync (hourly or on trigger)
  - Shares local usage metadata with hub

- **Hub → Superadmin (Internet + Manual Trigger):**
  - Admin-triggered when internet is available
  - Data is AES-256 encrypted
  - Payload contains metadata only (no user content)
  - POST endpoint: /api/sync

## Metadata Payload Example:
```json
{
  "company_id": "abc123",
  "token": "enc_token_here",
  "query_count": 450,
  "device_count": 7,
  "last_sync_local": "2025-06-16T09:00Z"
}

Response Handling:
✅ OK → Hub updates sync timestamp

# Trosyn AI - MVP 1 Pages

⛔ Soft Lock → Hub restricts usage

Local Storage:
Sync data stored in encrypted local file: hub.sync.meta.json

All child usage logs are rotated daily

"""

3. Code comment block
code_comment_block = """
/*
Trosyn AI Sync System

Child devices NEVER sync to the internet.

All child devices report usage to the Hub via LAN.

The Hub device can sync to the Superadmin server ONLY when:

A local admin is online

Sync is triggered manually (or by opening the Licensing page)

Hub-to-Superadmin sync sends:
- Company ID
- Token
- Usage stats (query count, device count)
- Last sync time

Server returns:
- OK status
- New token (if rotated)
- Soft lock signal (if plan expired or offline too long)

This ensures a secure, private, offline-first system with flexible enforcement.
*/
"""

Save all outputs to a single JSON file
full_doc = {
"trea_ide_doc": trea_doc,
"developer_doc": developer_doc.strip(),
"code_comment_block": code_comment_block.strip()
}

doc_path = "/mnt/data/trosyn_sync_system_docs.json"
with open(doc_path, "w") as f:
json.dump(full_doc, f, indent=2)

doc_path

Always show details

'/mnt/data/trosyn_sync_system_docs.json'