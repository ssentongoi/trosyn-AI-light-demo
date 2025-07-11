from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import datetime
import uuid

class ConflictInfo(BaseModel):
    """Tracks information about document conflicts."""
    conflict_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat())
    node_id: str
    version: int
    content: str

class Document(BaseModel):
    """Represents a document in the sync system with conflict tracking."""
    id: str
    version: int
    content: str
    title: Optional[str] = None
    last_modified: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat())
    last_modified_by: Optional[str] = None
    file_path: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    conflicts: List[ConflictInfo] = Field(default_factory=list)
    
    def has_conflicts(self) -> bool:
        """Returns True if the document has unresolved conflicts."""
        return len(self.conflicts) > 0
    
    def add_conflict(self, node_id: str, version: int, content: str) -> None:
        """Adds a conflict entry to the document."""
        self.conflicts.append(ConflictInfo(
            node_id=node_id,
            version=version,
            content=content
        ))
    
    def resolve_conflict(self, conflict_id: str, content: str) -> bool:
        """Resolves a conflict by ID and updates the document content."""
        for i, conflict in enumerate(self.conflicts):
            if conflict.conflict_id == conflict_id:
                self.content = content
                self.version = max(self.version, conflict.version) + 1
                self.last_modified = datetime.datetime.utcnow().isoformat()
                del self.conflicts[i]
                return True
        return False
