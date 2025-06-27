import os
import re
from typing import List, Dict, Any, Optional, Union
from pathlib import Path
from unstructured.partition.auto import partition
from unstructured.staging.base import convert_to_dict
from unstructured.chunking.title import chunk_by_title

class DocumentProcessor:
    """
    Handles document processing using Unstructured library.
    Supports various document formats including PDF, DOCX, PPTX, and more.
    """
    
    def __init__(self, output_dir: str = "processed_documents"):
        """
        Initialize the DocumentProcessor.
        
        Args:
            output_dir: Directory to store processed documents
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
    
    def chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 0) -> List[str]:
        """
        Split text into chunks of specified size with proper boundary handling.
        Strictly enforces chunk size limits while trying to break at sentence boundaries.
        
        Args:
            text: The text to chunk
            chunk_size: Maximum characters per chunk
            overlap: Number of characters to overlap between chunks (not currently used)
            
        Returns:
            List of text chunks
        """
        if not text or not text.strip():
            return []
        
        text = text.strip()
        chunks = []
        start = 0
        
        while start < len(text):
            # Define the target end position
            target_end = min(start + chunk_size, len(text))
            
            # If this is the last chunk, take everything remaining
            if target_end >= len(text):
                chunk = text[start:].strip()
                if chunk:
                    chunks.append(chunk)
                break
            
            # Define a reasonable search window (smaller is better for strict size limits)
            search_window = min(100, chunk_size // 5)  # Max 100 chars or 20% of chunk_size
            search_start = max(start, target_end - search_window)
            
            # Look for sentence break within the small window
            sentence_break = text.rfind('. ', search_start, target_end)
            
            if sentence_break != -1 and sentence_break > start:
                # Found a good break point, include the '. '
                end = sentence_break + 2
            else:
                # No good break found - enforce hard limit
                end = target_end
            
            # Extract the chunk and add to results
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            # Move to next chunk
            start = end
        
        return chunks

    def process_document(self, file_path: str, chunk_size: int = 1000) -> List[Dict[str, Any]]:
        """
        Process a document and return its chunks with metadata.
        
        Args:
            file_path: Path to the document file
            chunk_size: Maximum size of each chunk in characters
            
        Returns:
            List of document chunks with metadata
        """
        try:
            # Read the file content
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Chunk the content using our improved chunking logic
            chunks = self.chunk_text(content, chunk_size=chunk_size)
            
            # Prepare chunks with metadata
            result = []
            for i, chunk in enumerate(chunks):
                result.append({
                    'text': chunk,
                    'type': 'text',
                    'element_id': f"chunk_{i}",
                    'metadata': {
                        'filename': os.path.basename(file_path),
                        'filetype': os.path.splitext(file_path)[1].lower(),
                        'page_number': 1,
                        'chunk_number': i + 1,
                        'total_chunks': len(chunks)
                    }
                })
            
            return result
            
        except Exception as e:
            raise Exception(f"Error processing document {file_path}: {str(e)}")
    
    def process_directory(self, input_dir: str, recursive: bool = False) -> Dict[str, List[Dict[str, Any]]]:
        """
        Process all supported documents in a directory.
        
        Args:
            input_dir: Directory containing documents
            recursive: Whether to process subdirectories
            
        Returns:
            Dictionary mapping filenames to their chunks
        """
        input_path = Path(input_dir)
        if not input_path.exists():
            raise FileNotFoundError(f"Directory not found: {input_dir}")
            
        results = {}
        
        # Define supported file extensions
        supported_extensions = {
            '.pdf', '.docx', '.pptx', '.xlsx', '.txt', 
            '.md', '.eml', '.msg', '.rtf', '.odt', '.epub'
        }
        
        # Process files
        for file_path in input_path.rglob('*') if recursive else input_path.glob('*'):
            if file_path.is_file() and file_path.suffix.lower() in supported_extensions:
                try:
                    chunks = self.process_document(str(file_path))
                    results[file_path.name] = chunks
                except Exception as e:
                    print(f"Error processing {file_path.name}: {str(e)}")
        
        return results

    def save_chunks_to_json(self, chunks: List[Dict[str, Any]], output_path: str) -> str:
        """
        Save document chunks to a JSON file.
        
        Args:
            chunks: List of document chunks
            output_path: Path to save the JSON file
            
        Returns:
            Path to the saved JSON file
        """
        import json
        
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(chunks, f, ensure_ascii=False, indent=2)
            
        return str(output_path)

# Example usage
if __name__ == "__main__":
    # Example: Process a single document
    processor = DocumentProcessor()
    
    # Process a single document
    document_path = "path/to/your/document.pdf"
    if os.path.exists(document_path):
        chunks = processor.process_document(document_path)
        print(f"Processed {len(chunks)} chunks from {os.path.basename(document_path)}")
        
        # Save chunks to JSON
        output_file = os.path.join(processor.output_dir, "processed_chunks.json")
        processor.save_chunks_to_json(chunks, output_file)
        print(f"Saved chunks to {output_file}")
    else:
        print(f"File not found: {document_path}")
