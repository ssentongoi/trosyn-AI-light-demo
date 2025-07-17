import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Document, DocumentVersion } from '@/types/tauri';

type DocumentContextType = {
  currentDocument: Document | null;
  isLoading: boolean;
  error: string | null;
  loadDocument: (filePath?: string) => Promise<void>;
  saveDocument: (content: string, isAutoSave?: boolean) => Promise<void>;
  saveAsDocument: (content: string, filePath: string) => Promise<void>;
  getDocumentVersion: (versionId: string) => DocumentVersion | undefined;
  restoreVersion: (versionId: string) => Promise<void>;
  versions: DocumentVersion[];
};

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const versions = currentDocument?.versions || [];

  const loadDocument = useCallback(async (filePath?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const document = await invoke<Document>('load_document', { 
        filePath 
      });
      setCurrentDocument(document);
    } catch (err) {
      console.error('Error loading document:', err);
      setError('Failed to load document');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveDocument = useCallback(async (content: string, isAutoSave: boolean = false) => {
    if (!currentDocument) {
      throw new Error('No document is currently open');
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const updatedDoc = await invoke<Document>('save_document', {
        content,
        filePath: currentDocument.file_path,
        isAutoSave
      });
      
      setCurrentDocument(updatedDoc);
      return updatedDoc;
    } catch (err) {
      console.error('Error saving document:', err);
      setError('Failed to save document');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentDocument]);

  const saveAsDocument = useCallback(async (content: string, filePath: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedDoc = await invoke<Document>('save_document', {
        content,
        filePath,
        isAutoSave: false
      });
      
      setCurrentDocument(updatedDoc);
      return updatedDoc;
    } catch (err) {
      console.error('Error saving document as:', err);
      setError('Failed to save document');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getDocumentVersion = useCallback((versionId: string) => {
    if (!currentDocument) return undefined;
    return currentDocument.versions.find(v => v.id === versionId);
  }, [currentDocument]);

  const restoreVersion = useCallback(async (versionId: string) => {
    if (!currentDocument) {
      throw new Error('No document is currently open');
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const version = getDocumentVersion(versionId);
      if (!version) {
        throw new Error('Version not found');
      }
      
      // Restore the version by creating a new version with the old content
      const updatedDoc = await invoke<Document>('restore_document_version', {
        docId: currentDocument.id,
        versionId: version.id
      });
      
      setCurrentDocument(updatedDoc);
      return updatedDoc;
    } catch (err) {
      console.error('Error restoring version:', err);
      setError('Failed to restore version');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentDocument, getDocumentVersion]);

  return (
    <DocumentContext.Provider
      value={{
        currentDocument,
        isLoading,
        error,
        loadDocument,
        saveDocument,
        saveAsDocument,
        getDocumentVersion,
        restoreVersion,
        versions,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocument = (): DocumentContextType => {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocument must be used within a DocumentProvider');
  }
  return context;
};
