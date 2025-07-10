import { useState, useEffect, useCallback } from 'react';
import { Document, DocumentService } from '../services/DocumentService';
import { OutputData } from '@editorjs/editorjs';

export const useEditorDocument = (initialDocumentId?: string) => {
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load a document by ID
  const loadDocument = useCallback(async (docId: string) => {
    if (!docId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const loadedDoc = await DocumentService.getDocument(docId);
      if (loadedDoc) {
        setDocument(loadedDoc);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load document'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new document
  const createDocument = useCallback((title: string = 'Untitled Document') => {
    const newDoc = DocumentService.createEmptyDocument(title);
    setDocument({
      ...newDoc,
      id: undefined, // Will be set when saved
    });
    return newDoc;
  }, []);

  // Save the current document
  const saveDocument = useCallback(async (content?: OutputData) => {
    if (!document) return null;
    
    setIsSaving(true);
    setError(null);
    
    try {
      const docToSave = {
        ...document,
        content: content || document.content,
      };
      
      const savedDoc = await DocumentService.saveDocument(docToSave);
      setDocument(savedDoc);
      return savedDoc;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save document'));
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [document]);

  // Update document content
  const updateDocument = useCallback((updates: Partial<Document>) => {
    setDocument(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  // Load initial document if ID is provided
  useEffect(() => {
    if (initialDocumentId) {
      loadDocument(initialDocumentId);
    } else {
      // Create a new document if no ID is provided
      createDocument();
    }
  }, [initialDocumentId, loadDocument, createDocument]);

  return {
    document,
    isLoading,
    isSaving,
    error,
    loadDocument,
    createDocument,
    saveDocument,
    updateDocument,
  };
};

export default useEditorDocument;
