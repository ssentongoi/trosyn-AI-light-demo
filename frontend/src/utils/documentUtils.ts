import { invoke } from '@tauri-apps/api/tauri';
import { Document, DocumentVersion } from '@/types/tauri';

/**
 * Check if running in Tauri desktop environment
 */
export const isTauri = (): boolean => {
  return window.__TAURI__ !== undefined;
};

/**
 * Format a date for display
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Get a document title from file path
 */
export const getTitleFromPath = (path?: string): string => {
  if (!path) return 'Untitled Document';
  
  // Extract filename from path
  const filename = path.split(/[\\/]/).pop() || 'Untitled Document';
  
  // Remove extension
  return filename.replace(/\.[^/.]+$/, '');
};

/**
 * Save a document
 */
export const saveDocument = async (doc: Document): Promise<Document> => {
  if (isTauri()) {
    return await invoke<Document>('save_document', {
      content: JSON.stringify(doc),
      filePath: doc.filePath,
    });
  } else {
    // Browser fallback
    const docs = await getDocuments();
    const index = docs.findIndex((d) => d.id === doc.id);
    
    const updatedDoc: Document = {
      ...doc,
      updatedAt: new Date().toISOString(),
      isDirty: false,
    };
    
    if (index >= 0) {
      docs[index] = updatedDoc;
    } else {
      docs.push(updatedDoc);
    }
    
    localStorage.setItem('documents', JSON.stringify(docs));
    return updatedDoc;
  }
};

/**
 * Get all documents
 */
export const getDocuments = async (): Promise<Document[]> => {
  if (isTauri()) {
    return await invoke<Document[]>('list_documents');
  } else {
    // Browser fallback
    const docs = localStorage.getItem('documents');
    return docs ? JSON.parse(docs) : [];
  }
};

/**
 * Create a new document
 */
export const createDocument = (title: string = 'Untitled Document'): Document => {
  const now = new Date().toISOString();
  
  return {
    id: crypto.randomUUID(),
    title,
    content: { blocks: [] },
    versions: [
      {
        id: crypto.randomUUID(),
        timestamp: now,
        content: { blocks: [] },
        isAutoSave: false,
      },
    ],
    createdAt: now,
    updatedAt: now,
    isDirty: true,
  };
};

/**
 * Check for recovery files
 */
export const checkForRecoveryFiles = async (): Promise<Document[]> => {
  if (isTauri()) {
    return await invoke<Document[]>('list_recovery_files');
  }
  return [];
};

/**
 * Get word count from document content
 */
export const getWordCount = (content: any): number => {
  if (!content?.blocks) return 0;
  
  return content.blocks.reduce((count: number, block: any) => {
    if (block.type === 'paragraph' && block.data?.text) {
      return count + block.data.text.split(/\s+/).filter(Boolean).length;
    }
    return count;
  }, 0);
};

/**
 * Get reading time in minutes
 */
export const getReadingTime = (wordCount: number): number => {
  const wordsPerMinute = 200; // Average reading speed
  return Math.ceil(wordCount / wordsPerMinute);
};

/**
 * Get document statistics
 */
export const getDocumentStats = (doc: Document) => {
  const wordCount = getWordCount(doc.content);
  
  return {
    wordCount,
    readingTime: getReadingTime(wordCount),
    versionCount: doc.versions.length,
    lastModified: formatDate(doc.updatedAt),
    created: formatDate(doc.createdAt),
  };
};

export const documentUtils = {
  isTauri,
  formatDate,
  getTitleFromPath,
  saveDocument,
  getDocuments,
  createDocument,
  checkForRecoveryFiles,
  getWordCount,
  getReadingTime,
  getDocumentStats,
};

export default documentUtils;
