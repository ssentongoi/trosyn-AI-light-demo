import { useState, useCallback } from 'react';
import { DocumentFilter } from '../types/DocumentList.types';

export const useDocumentFilters = (
  initialFilters: DocumentFilter = {}
) => {
  const [filters, setFilters] = useState<DocumentFilter>(initialFilters);

  const updateFilter = useCallback(<K extends keyof DocumentFilter>(
    key: K,
    value: DocumentFilter[K] | undefined
  ) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (value === undefined) {
        delete newFilters[key];
      } else {
        newFilters[key] = value;
      }
      return newFilters;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({});
  }, []);

  return {
    filters,
    updateFilter,
    resetFilters,
    setFilters
  };
};
