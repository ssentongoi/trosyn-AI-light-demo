"""
Vector store service for handling document embeddings and storage using ChromaDB.
"""
import os
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from ..config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VectorStore:
    """
    A class to handle document storage and retrieval using ChromaDB.
    """
    
    def __init__(self, collection_name: str = "documents", persist_directory: str = None):
        """
        Initialize the vector store.
        
        Args:
            collection_name: Name of the collection to use or create
            persist_directory: Directory to persist the database (None for in-memory)
        """
        self.collection_name = collection_name
        self.persist_directory = persist_directory or os.path.join(settings.DATA_DIR, "chroma_db")
        self.embedding_model = None
        self.client = None
        self.collection = None
        
        # Create persist directory if it doesn't exist
        if self.persist_directory:
            os.makedirs(self.persist_directory, exist_ok=True)
        
        self._initialize_client()
        self._initialize_embedding_model()
    
    def _initialize_client(self):
        """Initialize the ChromaDB client and collection."""
        try:
            self.client = chromadb.Client(
                Settings(
                    chroma_db_impl="duckdb+parquet",
                    persist_directory=self.persist_directory,
                    anonymized_telemetry=False
                )
            )
            
            # Get or create the collection
            self.collection = self.client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
            logger.info(f"Initialized ChromaDB collection: {self.collection_name}")
            
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB client: {str(e)}")
            raise
    
    def _initialize_embedding_model(self):
        """Initialize the sentence transformer model for embeddings."""
        try:
            # Use a lightweight model for local development
            model_name = "all-MiniLM-L6-v2"
            self.embedding_model = SentenceTransformer(model_name)
            logger.info(f"Initialized embedding model: {model_name}")
        except Exception as e:
            logger.error(f"Failed to initialize embedding model: {str(e)}")
            raise
    
    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts.
        
        Args:
            texts: List of text strings to generate embeddings for
            
        Returns:
            List of embedding vectors
        """
        if not self.embedding_model:
            raise ValueError("Embedding model not initialized")
            
        embeddings = self.embedding_model.encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        return embeddings.tolist()
    
    def add_documents(
        self, 
        documents: List[Dict[str, Any]],
        ids: Optional[List[str]] = None,
        metadatas: Optional[List[Dict[str, Any]]] = None
    ) -> List[str]:
        """
        Add documents to the vector store.
        
        Args:
            documents: List of document dictionaries with 'text' and 'metadata' keys
            ids: Optional list of document IDs
            metadatas: Optional list of metadata dictionaries
            
        Returns:
            List of document IDs
        """
        if not documents:
            return []
            
        # Extract texts and ensure metadata is present
        texts = [doc.get('text', '') for doc in documents]
        if metadatas is None:
            metadatas = [doc.get('metadata', {}) for doc in documents]
            
        # Generate embeddings
        embeddings = self.get_embeddings(texts)
        
        # Generate IDs if not provided
        if ids is None:
            import uuid
            ids = [str(uuid.uuid4()) for _ in documents]
        
        # Add to collection
        self.collection.add(
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )
        
        # Persist changes if using persistent storage
        if self.persist_directory:
            self.client.persist()
            
        return ids
    
    def search(
        self, 
        query: str, 
        n_results: int = 5,
        filter_conditions: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar documents.
        
        Args:
            query: The search query string
            n_results: Number of results to return
            filter_conditions: Optional filter conditions for metadata
            
        Returns:
            List of matching documents with scores
        """
        # Generate query embedding
        query_embedding = self.get_embeddings([query])[0]
        
        # Perform search
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=filter_conditions,
            include=["documents", "metadatas", "distances"]
        )
        
        # Format results
        matches = []
        for i in range(len(results['ids'][0])):
            doc_id = results['ids'][0][i]
            document = results['documents'][0][i]
            metadata = results['metadatas'][0][i]
            distance = results['distances'][0][i]
            
            # Convert distance to similarity score (1 - normalized distance)
            similarity = 1.0 - min(max(distance, 0.0), 1.0)
            
            matches.append({
                'id': doc_id,
                'text': document,
                'metadata': metadata,
                'score': similarity
            })
        
        return matches
    
    def delete_documents(self, ids: List[str]) -> bool:
        """
        Delete documents by their IDs.
        
        Args:
            ids: List of document IDs to delete
            
        Returns:
            True if successful, False otherwise
        """
        try:
            self.collection.delete(ids=ids)
            
            # Persist changes if using persistent storage
            if self.persist_directory:
                self.client.persist()
                
            return True
        except Exception as e:
            logger.error(f"Failed to delete documents: {str(e)}")
            return False
    
    def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a document by its ID.
        
        Args:
            doc_id: Document ID
            
        Returns:
            Document dictionary or None if not found
        """
        try:
            result = self.collection.get(ids=[doc_id], include=["documents", "metadatas"])
            if not result['ids']:
                return None
                
            return {
                'id': result['ids'][0],
                'text': result['documents'][0],
                'metadata': result['metadatas'][0] if result['metadatas'] else {}
            }
        except Exception as e:
            logger.error(f"Failed to get document {doc_id}: {str(e)}")
            return None
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the collection.
        
        Returns:
            Dictionary with collection statistics
        """
        try:
            count = self.collection.count()
            return {
                'collection_name': self.collection_name,
                'document_count': count,
                'embedding_dimension': len(self.get_embeddings(["test"])[0]) if self.embedding_model else 0,
                'persistent': self.persist_directory is not None
            }
        except Exception as e:
            logger.error(f"Failed to get collection stats: {str(e)}")
            return {}

# Singleton instance
vector_store = VectorStore()
