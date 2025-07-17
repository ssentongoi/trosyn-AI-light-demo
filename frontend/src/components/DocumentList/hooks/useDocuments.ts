import { useCallback, useMemo } from 'react';
import { Document, DocumentFilter, DocumentSort } from '../types/DocumentList.types';

export const useDocuments = (
  documents: Document[],
  filters: DocumentFilter,
  sort?: DocumentSort
) => {
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Apply search filter
      if (filters.search && !doc.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      // Apply owner filter
      if (filters.ownerId && doc.owner.id !== filters.ownerId) {
        return false;
      }
      
      // Apply mimeType filter
      if (filters.mimeType && !doc.mimeType.startsWith(filters.mimeType)) {
        return false;
      }
      
      // Apply tags filter
      if (filters.tags?.length && 
          (!doc.tags || !filters.tags.every(tag => doc.tags?.some(t => t.id === tag)))) {
        return false;
      }
      
      // Apply boolean filters
      if (filters.isStarred !== undefined && doc.isStarred !== filters.isStarred) {
        return false;
      }
      
      if (filters.isShared !== undefined && doc.isShared !== filters.isShared) {
        return false;
      }
      
      if (filters.isPublic !== undefined && doc.isPublic !== filters.isPublic) {
        return false;
      }
      
      if (filters.isTrashed !== undefined && doc.isTrashed !== filters.isTrashed) {
        return false;
      }
      
      // Apply date range filter
      if (filters.dateFrom && new Date(doc.updatedAt) < new Date(filters.dateFrom)) {
        return false;
      }
      
      if (filters.dateTo && new Date(doc.updatedAt) > new Date(filters.dateTo)) {
        return false;
      }
      
      // Apply size range filter
      if (filters.sizeMin !== undefined && doc.size < filters.sizeMin) {
        return false;
      }
      
      if (filters.sizeMax !== undefined && doc.size > filters.sizeMax) {
        return false;
      }
      
      return true;
    });
  }, [documents, filters]);

  const sortedDocuments = useMemo(() => {
    if (!sort) return filteredDocuments;
    
    return [...filteredDocuments].sort((a, b) => {
      // @ts-ignore - Dynamic property access is safe here
      const aValue = a[sort.field];
      // @ts-ignore - Dynamic property access is safe here
      const bValue = b[sort.field];
      
      if (aValue === bValue) return 0;
      if (aValue == null) return sort.direction === 'asc' ? -1 : 1;
      if (bValue == null) return sort.direction === 'asc' ? 1 : -1;
      
      const comparison = aValue < bValue ? -1 : 1;
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredDocuments, sort]);

  // Get unique values for filter options
  const filterOptions = useMemo(() => {
    const owners = new Map<string, { id: string; name: string }>();
    const mimeTypes = new Set<string>();
    const tags = new Map<string, { id: string; name: string }>();
    
    documents.forEach(doc => {
      // Track owners
      if (doc.owner) {
        owners.set(doc.owner.id, { id: doc.owner.id, name: doc.owner.name });
      }
      
      // Track mime types
      if (doc.mimeType) {
        const type = doc.mimeType.split('/')[0];
        mimeTypes.add(type);
      }
      
      // Track tags
      doc.tags?.forEach(tag => {
        tags.set(tag.id, { id: tag.id, name: tag.name });
      });
    });
    
    return {
      owners: Array.from(owners.values()),
      mimeTypes: Array.from(mimeTypes).sort(),
      tags: Array.from(tags.values()).sort((a, b) => a.name.localeCompare(b.name))
    };
  }, [documents]);

  return {
    filteredDocuments: sortedDocuments,
    filterOptions,
    totalCount: documents.length,
    filteredCount: filteredDocuments.length
  };
};
