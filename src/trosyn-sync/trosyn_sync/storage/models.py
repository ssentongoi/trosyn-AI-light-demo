from pydantic import BaseModel
from typing import Optional
import datetime

class Document(BaseModel):
    id: str
    version: int
    content: str
    title: Optional[str] = None
    last_modified: Optional[str] = datetime.datetime.now().isoformat()
    file_path: Optional[str] = None
