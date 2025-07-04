"""
Document processing for unstructured documents.
"""
import os
import re
from typing import Dict, List, Optional, Union
from pathlib import Path
from ..providers.base import DocumentProcessor

class UnstructuredDocumentProcessor(DocumentProcessor):
    """Process unstructured documents (PDF, DOCX, TXT)."""
    
    def __init__(self, **kwargs):
        """Initialize the document processor."""
        self.supported_formats = ['.pdf', '.docx', '.txt']
        
    def process_document(self, file_path: Union[str, Path], chunk_size: int = 1000) -> Dict:
        """
        Process a document and return structured data.
        
        Args:
            file_path: Path to the document file
            chunk_size: Maximum size of each chunk in characters
            
        Returns:
            Dict containing document metadata and chunks
        """
        file_path = Path(file_path)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
            
        if file_path.suffix.lower() not in self.supported_formats:
            raise ValueError(f"Unsupported file format: {file_path.suffix}")
        
        try:
            # Read file content based on format
            if file_path.suffix.lower() == '.pdf':
                text = self._read_pdf(file_path)
            elif file_path.suffix.lower() == '.docx':
                text = self._read_docx(file_path)
            else:  # .txt
                text = self._read_text(file_path)
                
            # Clean and process text
            text = self._clean_text(text)
            chunks = self.chunk_text(text, chunk_size=chunk_size)
            
            return {
                'file_name': file_path.name,
                'file_path': str(file_path.absolute()),
                'file_size': os.path.getsize(file_path),
                'file_type': file_path.suffix.lower(),
                'text': text,
                'chunks': chunks,
                'num_chunks': len(chunks)
            }
            
        except Exception as e:
            raise Exception(f"Error processing document {file_path}: {str(e)}")
    
    def _read_pdf(self, file_path: Path) -> str:
        """Read text from a PDF file."""
        try:
            import PyPDF2
            text = []
            with open(file_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                for page in reader.pages:
                    text.append(page.extract_text() or '')
            return '\n'.join(text)
        except ImportError:
            raise ImportError("PyPDF2 is required for PDF processing. Install with: pip install PyPDF2")
    
    def _read_docx(self, file_path: Path) -> str:
        """Read text from a DOCX file."""
        try:
            import docx2txt
            return docx2txt.process(file_path)
        except ImportError:
            raise ImportError("docx2txt is required for DOCX processing. Install with: pip install docx2txt")
    
    def _read_text(self, file_path: Path) -> str:
        """Read text from a plain text file."""
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    
    def _clean_text(self, text: str) -> str:
        """Clean text while preserving structure and content."""
        if not text:
            return ""
            
        # Only remove truly problematic control characters
        # Keep newlines, tabs, and other whitespace
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', text)
        return text
    
    def chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 0) -> List[str]:
        """
        Split text into chunks of specified size with proper boundary handling.
        Strictly enforces chunk size limits while trying to break at natural boundaries.
        
        Args:
            text: The text to chunk
            chunk_size: Maximum characters per chunk
            overlap: Number of characters to overlap between chunks (not currently used)
            
        Returns:
            List of text chunks
        """
        if not text or not text.strip():
            return []
            
        # For very small chunk sizes, use optimized method
        if chunk_size <= 500:
            return self._chunk_text_small(text, chunk_size)
        
        # Create exact copies of the input for verification
        original_text = text
        
        # Character-based chunking with intelligent boundary detection
        chunks = []
        start = 0
        
        while start < len(text):
            # Hard limit - never exceed chunk_size
            end = min(start + chunk_size, len(text))
            
            # Only try to find natural break points if not at the end of text and within the chunk_size limit
            # CRITICAL: Always enforce chunk_size as a hard upper limit
            if end < len(text):
                # Calculate the maximum valid end position based on chunk_size
                max_end = start + chunk_size
                
                # Look for paragraph breaks (most preferred)
                paragraph_pos = text.rfind('\n\n', max(start, end - 50), min(end, max_end))
                if paragraph_pos > start and (paragraph_pos + 2 - start) <= chunk_size:
                    end = paragraph_pos + 2  # Include the paragraph break
                else:
                    # Try sentence breaks
                    for punct in ['. ', '! ', '? ', '.\n', '!\n', '?\n']:
                        pos = text.rfind(punct, max(start, end - 30), min(end, max_end))
                        if pos > start and (pos + len(punct) - start) <= chunk_size:
                            # Include the punctuation and space/newline
                            end = pos + len(punct)
                            break
                    
                    # If no sentence break found, try word breaks
                    # BUT only if we're at the maximum chunk size (meaning no other breaks found)
                    if end >= max_end:
                        # Look for the last space that keeps us under the size limit
                        space_pos = text.rfind(' ', max(start, end - 20), max_end)
                        if space_pos > start and (space_pos + 1 - start) <= chunk_size:
                            end = space_pos + 1  # Include the space
                    
                # Final check: ensure we never exceed chunk_size regardless of breaks
                if end - start > chunk_size:
                    end = start + chunk_size
            
            # Extract chunk and add if non-empty
            chunk = text[start:end]
            if chunk.strip():
                chunks.append(chunk)
            
            # Important: Always move forward even if we couldn't find a good break
            start = end
        
        # Verify total content is preserved
        reconstructed = "".join(chunks)
        if reconstructed != original_text:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(
                f"Chunking lost content! Original length: {len(original_text)}, "
                f"Reconstructed: {len(reconstructed)}"
            )
            
            # Emergency fix: If we lost content, revert to simple character-level chunking
            # This guarantees no content loss, though chunk boundaries may be suboptimal
            chunks = [original_text[i:i + chunk_size] for i in range(0, len(original_text), chunk_size)]
            
            # Extra verification
            if "".join(chunks) != original_text:
                logger.error("Emergency chunking also failed to preserve content")
        
        return chunks
        
    def _chunk_text_small(self, text: str, chunk_size: int) -> List[str]:
        """
        Specialized chunking for very small chunk sizes.
        Ensures strict size limits and perfect reconstruction using character-level slicing.
        """
        if not text or not text.strip():
            return []

        # Use simple character-based slicing to guarantee reconstruction and size limits.
        chunks = [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]
        
        # Filter out any empty chunks that might be created at the end.
        return [chunk for chunk in chunks if chunk]
