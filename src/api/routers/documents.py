import os
import shutil
import tempfile
import uuid
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends, Query
from fastapi.responses import JSONResponse, FileResponse
from typing import List, Optional, Dict, Any
from pathlib import Path
import json
import logging

from ..document_processor import DocumentProcessor
from ..models.document import DocumentChunk, DocumentProcessResponse, DocumentSearchRequest, DocumentSearchResponse
from ..services.vector_store import vector_store
from ..config import settings

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/v1/documents",
    tags=["documents"],
    responses={404: {"description": "Not found"}},
)

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Initialize document processor
processor = DocumentProcessor()

@router.post("/process")
async def process_document(
    file: UploadFile = File(...),
    chunk_size: int = 1000,
    keep_file: bool = False,
    add_to_vector_store: bool = True
) -> Dict[str, Any]:
    """
    Process an uploaded document and return its chunks.
    
    Args:
        file: The document file to process
        chunk_size: Maximum size of each chunk in characters
        keep_file: Whether to keep the uploaded file after processing
        add_to_vector_store: Whether to add the document to the vector store
        
    Returns:
        Document processing results including chunks and metadata
    """
    # Validate file type
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in settings.SUPPORTED_FILE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file_ext}. Supported types: {', '.join(settings.SUPPORTED_FILE_TYPES)}"
        )
    
    # Create a temporary file to save the upload
    temp_file = None
    try:
        # Save uploaded file
        temp_file = Path(settings.UPLOAD_DIR) / f"{uuid.uuid4()}{file_ext}"
        with open(temp_file, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Process the document
        chunks = processor.process_document(
            file_path=str(temp_file),
            chunk_size=chunk_size
        )
        
        # Prepare document chunks for vector store
        doc_chunks = []
        for chunk in chunks:
            chunk_data = {
                "text": chunk.text,
                "metadata": {
                    **chunk.metadata,
                    "chunk_type": chunk.type,
                    "element_id": chunk.element_id,
                    "original_filename": file.filename,
                    "file_type": file.content_type,
                    "processed_at": datetime.utcnow().isoformat()
                }
            }
            doc_chunks.append(chunk_data)
        
        # Add to vector store if requested
        doc_ids = []
        if add_to_vector_store and doc_chunks:
            doc_ids = vector_store.add_documents(doc_chunks)
        
        # Convert chunks to response model
        chunks_data = []
        if doc_ids:
            # If we have document IDs from the vector store, include them
            chunks_data = [
                {
                    "id": doc_id,
                    "text": chunk.text,
                    "type": chunk.type,
                    "element_id": chunk.element_id,
                    "metadata": chunk.metadata
                }
                for chunk, doc_id in zip(chunks, doc_ids)
            ]
        else:
            # Otherwise, just include the chunks without IDs
            chunks_data = [
                {
                    "id": None,
                    "text": chunk.text,
                    "type": chunk.type,
                    "element_id": chunk.element_id,
                    "metadata": chunk.metadata
                }
                for chunk in chunks
            ]
            
        result = {
            "filename": file.filename,
            "file_type": file.content_type,
            "chunk_count": len(chunks),
            "document_ids": doc_ids,
            "chunks": chunks_data,
            "metadata": {
                "original_filename": file.filename,
                "file_size": temp_file.stat().st_size,
                "processed_at": datetime.utcnow().isoformat(),
                "vector_store_added": add_to_vector_store
            }
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing document: {str(e)}"
        )
    finally:
        # Clean up temporary file if not keeping it
        if temp_file and not keep_file and temp_file.exists():
            try:
                temp_file.unlink()
            except Exception as e:
                logger.warning(f"Failed to delete temporary file {temp_file}: {str(e)}")

@router.post("/search", response_model=DocumentSearchResponse)
async def search_documents(
    search_request: DocumentSearchRequest,
    limit: int = Query(5, ge=1, le=100, description="Maximum number of results to return"),
    min_score: float = Query(0.5, ge=0.0, le=1.0, description="Minimum similarity score (0-1)")
) -> DocumentSearchResponse:
    """
    Search for documents using semantic search.
    
    Args:
        search_request: The search query and filters
        limit: Maximum number of results to return
        min_score: Minimum similarity score (0-1)
        
    Returns:
        List of matching documents with scores and metadata
    """
    try:
        # Apply filters
        filter_conditions = {}
        if search_request.filters:
            filter_conditions = search_request.filters.dict(exclude_unset=True)
        
        # Perform search
        results = vector_store.search(
            query=search_request.query,
            n_results=limit,
            filter_conditions=filter_conditions if filter_conditions else None
        )
        
        # Filter by minimum score
        filtered_results = [r for r in results if r['score'] >= min_score]
        
        # Format response
        return DocumentSearchResponse(
            query=search_request.query,
            results=filtered_results,
            total_results=len(filtered_results)
        )
    except Exception as e:
        logger.error("Error searching documents: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching documents: {str(e)}"
        )

@router.get("/supported-formats", response_model=List[str])
async def get_supported_formats() -> List[str]:
    """
    Get a list of supported document formats.
    
    Returns:
        List of supported file extensions
    """
    return settings.SUPPORTED_FILE_TYPES

@router.get("/status/{job_id}")
async def get_processing_status(job_id: str):
    """
    Check the status of a document processing job.
    
    TODO: Implement job tracking
    """
    return {
        "job_id": job_id,
        "status": "completed",  # Placeholder
        "progress": 100
    }
