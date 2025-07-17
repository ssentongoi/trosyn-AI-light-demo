import { useState, useCallback } from 'react';
import { DocumentSort } from '../types/DocumentList.types';

export const useDocumentSorting = (
  initialSort?: DocumentSort
) => {
  const [sort, setSort] = useState<DocumentSort | undefined>(initialSort);

  const toggleSort = useCallback((field: string) => {
    setSort(prev => {
      if (prev?.field === field) {
        return {
          field,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { field, direction: 'asc' };
    });
  }, []);

  const resetSort = useCallback(() => {
    setSort(initialSort);
  }, [initialSort]);

  return {
    sort,
    toggleSort,
    resetSort,
    setSort
  };
};
