<context>
### 1. Overview

**Project Name:** Trosyn AI
**Full Meaning:** Trust + Sync + Node
**Type:** Offline-first, self-hosted enterprise knowledge and AI assistant platform
**Primary Model:** Gemini 3 1B (with upgrade path to Gemini 3N)
**Platforms:** macOS, Windows (desktop app)

### 2. Project Summary

Trosyn AI is an offline-first, self-hosted AI system that allows companies to implement AI across their departments. It features a central admin hub and multiple department-specific apps (“child nodes”), each embedded with its own AI assistant that only accesses locally stored internal data.

The model does not rely on fine-tuning or internet data. Instead, it uses embeddings from internal company documents and stored memory to provide contextually accurate assistance. Each department (e.g. HR, Finance, Marketing) operates semi-independently, but admins have full oversight and inter-department access is possible via permission requests.

# Core Features  
- **Self-Hosted System**  
  Runs entirely on company infrastructure (Windows/Mac/Linux), ensuring no cloud dependencies and full data sovereignty.
- **Departmental Knowledge Bases**  
  Each department (HR, Marketing, Finance, etc.) has its own knowledge section, allowing for tailored data management and privacy.
- **AI Assistance per Department**  
  Integrated AI (Gemini 3.1B, upgradeable to Gemini 3N) provides department-specific reasoning and support using only relevant, locally stored data.
- **Cross-Department Access Controls**  
  Departments can request access to other departments’ data, with admin approval and granular permissions.
- **Admin Dashboard**  
  Centralized hub for managing users, permissions, updates, and AI settings.
- **Offline Capable**  
  Fully functional offline, with LAN sync for updates and data sharing.
- **Secure Data Storage**  
  Utilizes efficient file structures (SQLite or LiteFS) for storing documents and AI memory.
- **Memory System**  
  Stores user-fed knowledge, documents, and notes for AI reasoning using embeddings and search (no fine-tuning required).
- **Payment Integration**  
  Supports monthly licensing per user or team seat, with add-on billing options.
- **Lightweight AI Models**  
  Starts with Gemini 3.1B, with an upgrade path to Gemini 3N for improved performance.

# User Experience  
### 3. Problems Solved

* Lack of AI systems optimized for offline-first, self-hosted enterprise use
* Data security risks from cloud-based AI tools
* Fragmented company knowledge scattered across apps and teams
* High cost and complexity of customizing AI per company or department
* Limited control over usage and billing for internal tools

### 4. Target Audience

* Medium to large companies with internal departments (HR, Marketing, Finance, etc.)
* Teams in low-internet or high-security environments (e.g. law, healthcare, government)
* Enterprises wanting on-device AI reasoning with complete data ownership

### 5. Key Features

**AI + Department Memory**

* Each department has its own memory and AI space
* AI model pulls info only from embedded department memory (via embeddings)
* Supports per-user memory customization (e.g. remembering name, last task)

**Offline-First Architecture**

* Fully functional offline with local file access, logs, storage
* LAN sync between child nodes and main server
* Randomized sync trigger to prevent sync abuse

**Cross-Department Access & Admin Control**

* Users can request access to other department data
* Admin sees updates across all departments daily
* Admin dashboard includes logs, sync status, billing, user activity

**Billing and Licensing System**

* Hybrid model: base monthly cost + per-package pricing (e.g. 20 users)
* Additional users/add-ons can be purchased
* Offline billing enforcement using encrypted logs, time-based tokens, soft locks

**Optional External Connectors**

* Gmail, Google Drive, Docs (when online)
* Modular system allows future connector additions

**Security and Abuse Prevention**

* Hard cap on offline usage logs before sync is required
* Local device fingerprinting
* Periodic verification to prevent permanent offline use

### 6. Tech Stack

**Frontend:** React (for cross-platform UI)
**Backend:** Lightweight offline-capable backend (Node.js, Python optional)
**AI Model:** Gemini 3 1B (replaceable with 3N)
**Embeddings:** Stored and queried on-device per department
**Data Storage:** Local encrypted database, optionally backed up locally
**Sync:** Peer-to-peer LAN sync + central server with control panel
**Licensing:** Built-in license and usage monitoring system

### 7. MVP Scope

* Admin panel (with control, sync, license management)
* Department node app (HR, Marketing, Finance)
* Local AI model running Gemini 3 1B with embedding queries
* Memory system (per department, per user)
* Basic permission system (cross-department access request)
* LAN sync system
* Offline billing and abuse prevention

### 8. Future Plans

* Upgrade to Gemini 3N when available
* Visual workflow builder (drag & drop assistant setup)
* Integration with mobile (view-only companion app)
* More external service connectors
* Enterprise-grade encryption and backup module
</context>
<PRD>
# Technical Architecture  
- **System Components**  
  - Admin Hub (central server): Controls sync, licensing, and global settings
  - Child Apps (per department): Standalone apps for local data and AI features
  - LLM Engine: Gemini 3.1B (offline), upgradeable to Gemini 3N
  - Sync System: LAN-based, with optional secure online fallback
  - Payment System: Hybrid model with local enforcement
- **Data Models**  
  - Departmental document stores
  - User profiles and permissions
  - Embedding/vector databases for AI memory
  - Audit logs and usage records
- **APIs and Integrations**  
  - Local APIs for document management, search, and AI queries
  - WebSocket or REST APIs for LAN sync
  - Payment/license verification endpoints (admin-controlled)
- **Infrastructure Requirements**  
  - Runs on Windows/Mac/Linux desktops or servers
  - Local storage (SQLite/LiteFS)
  - Optional LAN connectivity for sync

# Development Roadmap  
- **MVP Requirements**  
  - Departmental document upload and management
  - Basic LLM reasoning using Gemini 3.1B (no fine-tuning)
  - LAN sync between Admin Hub and Child Apps
  - Admin dashboard for monitoring and control
  - Basic payment system with package-based subscriptions
  - Core offline-first functionality
- **Future Enhancements**  
  - Upgrade to Gemini 3N for improved AI
  - Advanced cross-department analytics and reporting
  - Enhanced access control and audit features
  - Integration with external identity providers (LDAP, SSO)
  - Mobile and web client support
- **Scope Detailing**  
  - Each phase delivers atomic, buildable features (e.g., document ingestion, AI query, sync, dashboard modules)

# Logical Dependency Chain
- Foundation:  
  - Local document storage and retrieval
  - User authentication and permissions
- Usable Frontend:  
  - Departmental dashboards and document management UI
  - Basic AI query interface
- Build-Upon Features:  
  - LAN sync and admin controls
  - Payment/license enforcement
  - Cross-department access requests
  - Advanced analytics and reporting

# Risks and Mitigations  
- **Technical Challenges**  
  - Ensuring robust offline operation: Use proven local storage and LAN sync technologies
  - Efficient AI reasoning on local hardware: Start with lightweight models, allow upgrades
- **MVP Definition**  
  - Risk of scope creep: Strictly define MVP as core document management, AI query, and sync
- **Resource Constraints**  
  - Modular design allows phased development and easy scaling
  - Prioritize features that deliver immediate value and usability

# Appendix  
- **Research Findings**  
  - Many organizations require offline, self-hosted solutions for compliance and privacy
  - Departmental silos are a major pain point; controlled cross-department access is highly valued
- **Technical Specifications**  
  - Frontend: React (Vite or Create React App)
  - Backend: Node.js, Electron for desktop
  - Vector Store: Chroma or Qdrant (local)
  - Database: SQLite or LiteFS
  - Sync: WebSockets or local APIs
  - Payments: Local license enforcement, admin-verified tokens
</PRD>
- **Data Connectors**  
  Optional secure gateways for syncing with external cloud services

# Version Controls
- **Goal:**
  Track changes to key items (e.g. knowledge entries, user notes, system configs) using snapshots. Enable rollback, syncing, and audit trail — similar to Git commits — but lightweight and offline-capable.

- **Key Concepts:**
  1. Snapshot
     A full copy of an item at a point in time.
     Stored as a JSON object with metadata.

     ```json
     {
       "id": "note_124",
       "version": "v3",
       "timestamp": "2025-06-13T14:00:00Z",
       "author": "user_21",
       "content": "How to file quarterly reports",
       "hash": "sha256...",
       "parent": "v2"
     }
     ```

  2. Hashing
     Use SHA-256 to hash each snapshot’s content + metadata.
     Use hash for integrity and deduplication.

  3. Parent Linking
     Each snapshot points to its previous version (parent field).
     Enables rollback and version trees.

  4. Change Detection
     When a file or entry is edited:
     Compare new hash to last saved version.
     If different, save as new snapshot.
     Store only changed versions (like commits).

  5. Storage
     Store snapshots in flat files (/snapshots) or local database (e.g. SQLite table: snapshots).
     Organize by item_id, sorted by timestamp.

- **Example Folder Structure (File-based):**
  ```pgsql
  /snapshots/
    notes/
      note_124_v1.json
      note_124_v2.json
      note_124_v3.json
    settings/
      config_main_v1.json
  ```

- **Features Supported:**
  Version history
  Rollback (load any previous version)
  Audit (who/when changed something)
  Sync safety (conflict detection via hash)

- **What’s Not Included (by design):**
  Branching/merging
  Stashing
  Rebase/rewrite history

- **Implementation Hints:**
  Add a SnapshotManager class/module:
  saveSnapshot(item_id, content, author)
  getSnapshot(item_id, version)
  getLatest(item_id)
  compareSnapshots(a, b) (diff text)
  Optimize with compression if needed.
  For large content (e.g. AI knowledge), store only deltas if snapshot size becomes a problem.

- **Minimal Git-Like Snapshot System (Python version):**
  ```python
  import os
  import json
  import hashlib
  from datetime import datetime

  SNAPSHOT_DIR = "./snapshots"

  def sha256(data: str) -> str:
      return hashlib.sha256(data.encode('utf-8')).hexdigest()

  def ensure_dir(path):
      if not os.path.exists(path):
          os.makedirs(path)

  class SnapshotManager:
      def __init__(self, base_dir=SNAPSHOT_DIR):
          self.base_dir = base_dir
          ensure_dir(base_dir)

      def _get_item_dir(self, category: str, item_id: str):
          path = os.path.join(self.base_dir, category, item_id)
          ensure_dir(path)
          return path

      def _get_latest_version(self, item_dir: str) -> int:
          files = [f for f in os.listdir(item_dir) if f.endswith(".json")]
          versions = [int(f.replace("v", "").replace(".json", "")) for f in files]
          return max(versions) if versions else 0

      def save_snapshot(self, category: str, item_id: str, content: dict, author: str):
          item_dir = self._get_item_dir(category, item_id)
          latest_version = self._get_latest_version(item_dir)
          version = latest_version + 1

          snapshot = {
              "id": item_id,
              "version": f"v{version}",
              "timestamp": datetime.utcnow().isoformat(),
              "author": author,
              "content": content,
              "hash": sha256(json.dumps(content, sort_keys=True)),
              "parent": f"v{latest_version}" if latest_version > 0 else None
          }

          filename = os.path.join(item_dir, f"v{version}.json")
          with open(filename, "w") as f:
              json.dump(snapshot, f, indent=2)

          return snapshot

      def get_snapshot(self, category: str, item_id: str, version: str):
          item_dir = self._get_item_dir(category, item_id)
          filename = os.path.join(item_dir, f"{version}.json")
          if os.path.exists(filename):
              with open(filename) as f:
                  return json.load(f)
          return None

      def get_latest_snapshot(self, category: str, item_id: str):
          item_dir = self._get_item_dir(category, item_id)
          latest_version = self._get_latest_version(item_dir)
          return self.get_snapshot(category, item_id, f"v{latest_version}")

      def list_versions(self, category: str, item_id: str):
          item_dir = self._get_item_dir(category, item_id)
          files = sorted(os.listdir(item_dir))
          return [f.replace(".json", "") for f in files if f.endswith(".json")]
  ```

- **Example Usage:**
  ```python
  mgr = SnapshotManager()

  # Save a snapshot
  content = {"title": "Quarterly Report", "body": "Step 1: Do this..."}
  snapshot = mgr.save_snapshot("notes", "note_124", content, "user_21")

  # Get latest snapshot
  latest = mgr.get_latest_snapshot("notes", "note_124")

  # Get specific version
  v1 = mgr.get_snapshot("notes", "note_124", "v1")

  # List all versions
  versions = mgr.list_versions("notes", "note_124")
  ```

- **Extend with:**
  compare_snapshots(a, b) to show diffs (text diff, JSON diff)
  Compression (e.g. gzip files)
  SQLite-based version if you want DB storage instead of files