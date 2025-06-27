"""Vector store implementation for document storage and retrieval."""

class VectorStore:
    """A simple in-memory vector store for testing purposes."""
    
    def __init__(self):
        self.vectors = {}
    
    def add_document(self, doc_id: str, embedding: list):
        """Add a document embedding to the store."""
        self.vectors[doc_id] = embedding
    
    def search(self, query_embedding: list, k: int = 5):
        """Search for similar documents."""
        # Simple implementation that just returns the first k documents
        return list(self.vectors.items())[:k]
    
    def delete_document(self, doc_id: str):
        """Remove a document from the store."""
        self.vectors.pop(doc_id, None)
