import { useState, useCallback, useEffect } from 'react';
import { useDocument } from '@/contexts/DocumentContext';

export const useDocumentEditor = () => {
  const { 
    currentDocument, 
    saveDocument, 
    saveAsDocument, 
    loadDocument,
    restoreVersion,
    isLoading
  } = useDocument();
  
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);

  // Update content when current document changes
  useEffect(() => {
    if (currentDocument) {
      setContent(currentDocument.content);
      setActiveVersionId(currentDocument.versions[0]?.id || null);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } else {
      setContent('');
      setActiveVersionId(null);
      setLastSaved(null);
      setHasUnsavedChanges(false);
    }
  }, [currentDocument]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!content) return;
    
    setIsSaving(true);
    try {
      await saveDocument(content);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving document:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [content, saveDocument]);

  const handleSaveAs = useCallback(async (filePath: string) => {
    if (!content) return null;
    
    setIsSaving(true);
    try {
      const doc = await saveAsDocument(content, filePath);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      return doc;
    } catch (error) {
      console.error('Error saving document as:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [content, saveAsDocument]);

  const handleLoadDocument = useCallback(async (filePath?: string) => {
    try {
      await loadDocument(filePath);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error loading document:', error);
      throw error;
    }
  }, [loadDocument]);

  const handleRestoreVersion = useCallback(async (versionId: string) => {
    try {
      await restoreVersion(versionId);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error restoring version:', error);
      throw error;
    }
  }, [restoreVersion]);

  const handleVersionSelect = useCallback((version: any) => {
    setContent(version.content);
    setActiveVersionId(version.id);
    setHasUnsavedChanges(false);
  }, []);

  return {
    content,
    setContent: handleContentChange,
    currentDocument,
    isSaving: isSaving || isLoading,
    lastSaved,
    hasUnsavedChanges,
    activeVersionId,
    saveDocument: handleSave,
    saveAsDocument: handleSaveAs,
    loadDocument: handleLoadDocument,
    restoreVersion: handleRestoreVersion,
    onVersionSelect: handleVersionSelect,
  };
};
