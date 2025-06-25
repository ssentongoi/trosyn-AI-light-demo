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