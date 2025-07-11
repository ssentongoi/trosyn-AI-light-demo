"""
Memory Engine for Trosyn AI

This module provides personalized memory storage and retrieval for AI interactions.
Memories are stored locally on the user's device and can be used to provide
context-aware responses and maintain conversation history.
"""

from pathlib import Path
from typing import Dict, Any, Optional, List
import json
import uuid
from datetime import datetime, timezone
from cryptography.fernet import Fernet
import os

class MemoryEngine:
    """
    Memory engine for storing and retrieving user-specific AI context.
    
    Handles local storage, encryption, and basic memory operations.
    """
    
    def __init__(self, user_id: str, storage_path: Optional[Path] = None, 
                 encryption_key: Optional[bytes] = None):
        """
        Initialize the memory engine for a specific user.
        
        Args:
            user_id: Unique identifier for the user
            storage_path: Directory where memory files will be stored
            encryption_key: Optional encryption key (32-byte URL-safe base64-encoded)
        """
        self.user_id = user_id
        self.storage_path = storage_path or Path.home() / ".trosyn_ai" / "memory"
        self.encryption_key = encryption_key
        self.cipher = Fernet(encryption_key) if encryption_key else None
        self.memory_file = self.storage_path / f"{user_id}.json"
        self.memory: Dict[str, Any] = self._load_memory()
    
    def _ensure_storage_path(self) -> None:
        """Ensure the storage directory exists."""
        self.storage_path.mkdir(parents=True, exist_ok=True)
    
    def _load_memory(self) -> Dict[str, Any]:
        """Load memory from disk, decrypting if necessary."""
        self._ensure_storage_path()
        
        if not self.memory_file.exists():
            return self._get_default_memory()
            
        try:
            data = self.memory_file.read_bytes()
            if self.cipher:
                data = self.cipher.decrypt(data)
            return json.loads(data.decode('utf-8'))
        except (json.JSONDecodeError, OSError) as e:
            # If there's an error loading, return default memory
            return self._get_default_memory()
    
    def _save_memory(self) -> None:
        """Save memory to disk, encrypting if necessary."""
        self._ensure_storage_path()
        data = json.dumps(self.memory, default=str).encode('utf-8')
        
        if self.cipher:
            data = self.cipher.encrypt(data)
            
        # Write to temporary file first, then rename to ensure atomicity
        temp_file = self.memory_file.with_suffix('.tmp')
        try:
            temp_file.write_bytes(data)
            temp_file.replace(self.memory_file)
        except Exception:
            if temp_file.exists():
                temp_file.unlink()
            raise
    
    def _get_default_memory(self) -> Dict[str, Any]:
        """Return a new memory structure with default values."""
        return {
            "user_id": self.user_id,
            "name": "",
            "role": "",
            "preferences": {
                "voice": "neutral",
                "assistant_mode": "detailed"
            },
            "context": {
                "last_topics": [],
                "current_focus": "",
                "recent_documents": []
            },
            "usage_stats": {
                "sessions": 0,
                "last_active": datetime.now(timezone.utc).isoformat()
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    
    def update_context(self, context_updates: Dict[str, Any]) -> None:
        """
        Update the user's context with new information.
        
        Args:
            context_updates: Dictionary of context updates to apply
        """
        # Update top-level fields
        for key, value in context_updates.items():
            if key in self.memory and isinstance(self.memory[key], dict) and isinstance(value, dict):
                self.memory[key].update(value)
            else:
                self.memory[key] = value
        
        # Always update the updated_at timestamp
        self.memory["updated_at"] = datetime.now(timezone.utc).isoformat()
        self._save_memory()
    
    def add_interaction(self, query: str, response: str, metadata: Optional[Dict] = None) -> str:
        """
        Record a new interaction with the AI.
        
        Args:
            query: User's query
            response: AI's response
            metadata: Additional metadata about the interaction
            
        Returns:
            Interaction ID
        """
        interaction_id = str(uuid.uuid4())
        interaction = {
            "id": interaction_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "query": query,
            "response": response,
            "metadata": metadata or {}
        }
        
        # Add to interactions list
        if "interactions" not in self.memory:
            self.memory["interactions"] = []
            
        self.memory["interactions"].append(interaction)
        
        # Update last active
        self.memory["usage_stats"]["last_active"] = datetime.now(timezone.utc).isoformat()
        self.memory["usage_stats"]["sessions"] = self.memory["usage_stats"].get("sessions", 0) + 1
        
        # Update recent topics
        if "context" not in self.memory:
            self.memory["context"] = {"last_topics": []}
            
        self.memory["context"]["last_topics"] = [
            query[:100],  # Store first 100 chars as topic
            *self.memory["context"].get("last_topics", [])[:4]  # Keep last 5 topics
        ]
        
        self._save_memory()
        return interaction_id
    
    def get_context_summary(self) -> Dict[str, Any]:
        """
        Get a summary of the user's context for AI prompting.
        
        Returns:
            Dictionary containing context summary
        """
        return {
            "user": {
                "name": self.memory.get("name", ""),
                "role": self.memory.get("role", ""),
                "preferences": self.memory.get("preferences", {})
            },
            "context": {
                "current_focus": self.memory.get("context", {}).get("current_focus", ""),
                "recent_topics": self.memory.get("context", {}).get("last_topics", [])[:3],
                "recent_documents": self.memory.get("context", {}).get("recent_documents", [])[:3]
            },
            "usage": self.memory.get("usage_stats", {})
        }
    
    def export_memory(self, export_path: Path) -> Path:
        """
        Export the user's memory to a file.
        
        Args:
            export_path: Path where to save the exported memory
            
        Returns:
            Path to the exported file
        """
        data = json.dumps(self.memory, indent=2, default=str).encode('utf-8')
        
        if self.cipher:
            data = self.cipher.encrypt(data)
            
        export_path.write_bytes(data)
        return export_path
    
    @classmethod
    def import_memory(cls, user_id: str, import_path: Path, encryption_key: Optional[bytes] = None) -> 'MemoryEngine':
        """
        Import memory from a file.
        
        Args:
            user_id: User ID to import memory for
            import_path: Path to the memory file to import
            encryption_key: Optional encryption key
            
        Returns:
            New MemoryEngine instance with imported memory
        """
        memory_engine = cls(user_id, encryption_key=encryption_key)
        data = import_path.read_bytes()
        
        if encryption_key:
            cipher = Fernet(encryption_key)
            data = cipher.decrypt(data)
            
        memory_engine.memory = json.loads(data.decode('utf-8'))
        memory_engine._save_memory()
        return memory_engine
