import { useState, useCallback } from 'react';
import { Document } from '../types/DocumentList.types';

export interface DocumentSelectionState {
  selectedDocuments: string[];
  toggleSelection: (id: string) => void;
  selectAll: (documentIds: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  selectedCount: number;
}

export const useDocumentSelection = (
  controlledSelected?: string[],
  defaultSelected: string[] = [],
  onChange?: (selected: string[]) => void
): DocumentSelectionState => {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    controlledSelected ?? defaultSelected
  );

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSelected = prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id];
      onChange?.(newSelected);
      return newSelected;
    });
  }, [onChange]);

  const selectAll = useCallback((documentIds: string[]) => {
    setSelectedIds(documentIds);
    onChange?.(documentIds);
  }, [onChange]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    onChange?.([]);
  }, [onChange]);

  return {
    selectedDocuments: selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected: (id: string) => selectedIds.includes(id),
    selectedCount: selectedIds.length
  };
};
