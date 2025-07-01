from pydantic import BaseModel
from typing import Optional

class NodeInfo(BaseModel):
    """Represents the information about a discovered node."""
    id: str
    name: str
    port: int
    address: Optional[str] = None
    last_seen: Optional[float] = None

class Message(BaseModel):
    """Represents a discovery message broadcasted by a node."""
    node_id: str
    node_name: str
    port: int
