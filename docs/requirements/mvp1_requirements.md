# Filter only MVP 1-related pages from previously defined page set
mvp1_pages_filtered = [page for page in trea_ide_pages["pages"] if page["name"] in [
    "Superadmin Dashboard",
    "Company Hub Dashboard",
    "Licensing & Sync Page"
]]

# Recreate only MVP 1 focused Trea IDE doc
trea_ide_mvp1 = {
    "title": "Trosyn AI - MVP 1 Core Pages",
    "description": "Pages required for the MVP 1 version of Trosyn AI. These include essential dashboards and sync/licensing controls.",
    "pages": mvp1_pages_filtered
}

# Filter developer doc for MVP 1 relevant pages
developer_doc_mvp1 = """
# Trosyn AI - MVP 1 Pages

## 1. Superadmin Dashboard
- Displays all companies with status and sync info
- Token validation, sync timestamp
- Pull-only access from synced hubs

## 2. Company Hub Dashboard
- Local dashboard for a company node
- Offline-first, syncs to Superadmin manually
- Displays all department summaries

## 3. Licensing & Sync Page
- Manual sync trigger interface
- Shows current license token, expiration
- Logs and offline time tracking
"""

# Code comment for MVP 1 only
code_comment_mvp1 = """
/*
Trosyn AI - MVP 1 Page Set

1. Superadmin Dashboard
   - Central control for monitoring company nodes
   - No internal access; metadata only

2. Company Hub Dashboard
   - Main company control panel
   - Operates offline, with manual sync

3. Licensing & Sync Page
   - License key status, sync trigger
   - Offline time limits and logs
*/
"""

# Save this as a separate JSON
mvp1_doc_package = {
    "trea_ide_doc": trea_ide_mvp1,
    "developer_doc": developer_doc_mvp1.strip(),
    "code_comment_block": code_comment_mvp1.strip()
}

mvp1_doc_path = "/mnt/data/trosyn_mvp1_pages_doc.json"
with open(mvp1_doc_path, "w") as f:
    json.dump(mvp1_doc_package, f, indent=2)

mvp1_doc_path

# Re-run after execution state reset: regenerate MVP 1 page documentation JSON

import json

# Define MVP 1 pages
mvp1_pages_filtered = [
    {
        "name": "Superadmin Dashboard",
        "description": "High-level overview of all connected companies. Displays status, license state, and sync timestamps.",
        "components": ["Company list", "Status indicator", "Token validity", "Last sync", "Soft lock info"]
    },
    {
        "name": "Company Hub Dashboard",
        "description": "Main operational interface for a company. Hosts department-level summaries, usage, and sync state.",
        "components": ["Department status", "License panel", "Notifications", "Manual sync button"]
    },
    {
        "name": "Licensing & Sync Page",
        "description": "Settings page for sync control, token management, and license status.",
        "components": ["Token info", "Manual sync button", "Export log", "Offline time tracker"]
    }
]

# Trea IDE doc
trea_ide_mvp1 = {
    "title": "Trosyn AI - MVP 1 Core Pages",
    "description": "Pages required for the MVP 1 version of Trosyn AI. These include essential dashboards and sync/licensing controls.",
    "pages": mvp1_pages_filtered
}

# Developer doc
developer_doc_mvp1 = """
# Trosyn AI - MVP 1 Pages

## 1. Superadmin Dashboard
- Displays all companies with status and sync info
- Token validation, sync timestamp
- Pull-only access from synced hubs

## 2. Company Hub Dashboard
- Local dashboard for a company node
- Offline-first, syncs to Superadmin manually
- Displays all department summaries

## 3. Licensing & Sync Page
- Manual sync trigger interface
- Shows current license token, expiration
- Logs and offline time tracking
"""

# Code comment block
code_comment_mvp1 = """
/*
Trosyn AI - MVP 1 Page Set

1. Superadmin Dashboard
   - Central control for monitoring company nodes
   - No internal access; metadata only

2. Company Hub Dashboard
   - Main company control panel
   - Operates offline, with manual sync

3. Licensing & Sync Page
   - License key status, sync trigger
   - Offline time limits and logs
*/
"""

# Combine into one package
mvp1_doc_package = {
    "trea_ide_doc": trea_ide_mvp1,
    "developer_doc": developer_doc_mvp1.strip(),
    "code_comment_block": code_comment_mvp1.strip()
}

# Save to file
mvp1_doc_path = "/mnt/data/trosyn_mvp1_pages_doc.json"
with open(mvp1_doc_path, "w") as f:
    json.dump(mvp1_doc_package, f, indent=2)

mvp1_doc_path
