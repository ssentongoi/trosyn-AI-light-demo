import { useState, useEffect, useCallback } from 'react';

interface UseSelectionPopupProps {
  editorRef: React.RefObject<HTMLElement | null>;
  onAction: (action: string) => void;
}

export const useSelectionPopup = ({ editorRef, onAction }: UseSelectionPopupProps) => {
  const [selection, setSelection] = useState<Range | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setIsVisible(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const editorElement = editorRef.current;
    
    // Check if selection is within the editor
    if (
      editorElement && 
      !selection.isCollapsed && 
      editorElement.contains(range.commonAncestorContainer)
    ) {
      setSelection(range);
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [editorRef]);

  const handleAction = useCallback((action: string) => {
    onAction(action);
    setIsVisible(false);
  }, [onAction]);

  useEffect(() => {
    // Debounce selection changes to improve performance
    const debounceTimer = setTimeout(handleSelectionChange, 100);
    return () => clearTimeout(debounceTimer);
  }, [handleSelectionChange]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  return {
    selection: isVisible ? selection : null,
    isVisible,
    onAction: handleAction,
    onClose: () => setIsVisible(false),
  };
};
