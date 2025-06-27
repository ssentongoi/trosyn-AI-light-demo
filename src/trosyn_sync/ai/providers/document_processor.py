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
        
        For very small chunk sizes (<= 10), uses a simpler algorithm to ensure
        strict size limits are maintained.
        
        Args:
            text: The text to chunk
            chunk_size: Maximum characters per chunk
            overlap: Number of characters to overlap between chunks (not currently used)
            
        Returns:
            List of text chunks
        """
        if not text or not text.strip():
            return []
            
        # For very small chunk sizes, use a simpler algorithm
        if chunk_size <= 10:
            return self._chunk_text_small(text, chunk_size)
            
        # Preserve original text exactly
        text = text
        chunks = []
        start = 0
        
        while start < len(text):
            target_end = start + chunk_size
            if target_end >= len(text):
                chunk = text[start:]
                if chunk.strip():
                    chunks.append(chunk)
                break

            # Find the best possible break point by searching backwards from target_end.
            # We search in a "window" from the end of the chunk (e.g., last 10%).
            search_window_start = start + int(chunk_size * 0.9)
            
            actual_end = target_end

            # Priority 1: Paragraph break
            pos = text.rfind('\n\n', search_window_start, target_end + 1)
            if pos != -1:
                actual_end = pos + 2
            else:
                # Priority 2: Sentence break
                best_sent_pos = -1
                sent_break_len = 0
                # Note: The rstrip() logic is to handle cases like '. ' but only count the '.'
                for punct in ['. ', '! ', '? ', '.\n', '!\n', '?\n']:
                    pos = text.rfind(punct, search_window_start, target_end + 1)
                    if pos > best_sent_pos:
                        best_sent_pos = pos
                        sent_break_len = len(punct.rstrip())
                if best_sent_pos != -1:
                    actual_end = best_sent_pos + sent_break_len
                else:
                    # Priority 3: Word break (space)
                    pos = text.rfind(' ', search_window_start, target_end + 1)
                    if pos != -1:
                        # Break after the space
                        actual_end = pos + 1

            # Ensure we always make progress
            if actual_end <= start:
                actual_end = min(start + chunk_size, len(text))

            chunk = text[start:actual_end]
            if chunk.strip():
                chunks.append(chunk)
            
            start = actual_end
        
        # Verify we didn't lose any text
        reconstructed = ''.join(chunks)
        if reconstructed != text:
            # If we lost text, fall back to simple chunking
            if len(reconstructed) != len(text):
                return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]
        
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
