import { Document } from '../../../types/document';

/**
 * Format bytes to a human-readable string
 * @param bytes - The number of bytes
 * @param decimals - Number of decimal places to show
 * @returns Formatted string with appropriate unit (B, KB, MB, GB, etc.)
 */
export const bytesToSize = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Get file extension from filename
 * @param filename - The filename
 * @returns File extension in lowercase without the dot
 */
export const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
};

/**
 * Get MIME type category
 * @param mimeType - The MIME type string
 * @returns Category of the file (image, document, spreadsheet, etc.)
 */
export const getMimeTypeCategory = (mimeType: string): string => {
  if (!mimeType) return 'other';
  
  const [type] = mimeType.split('/');
  
  switch (type) {
    case 'image':
      return 'image';
    case 'audio':
      return 'audio';
    case 'video':
      return 'video';
    case 'application':
      if (mimeType.includes('pdf')) return 'pdf';
      if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType.includes('sheet')) return 'spreadsheet';
      if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentation';
      if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
      if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive';
      return 'document';
    default:
      return 'other';
  }
};

// Type guard to check if a value is a valid date
export const isValidDate = (date: unknown): date is Date | string => {
  if (!date) return false;
  if (date instanceof Date) return !isNaN(date.getTime());
  if (typeof date === 'string') return !isNaN(new Date(date).getTime());
  return false;
};

/**
 * Sort documents array based on sort configuration
 * @param documents - Array of documents to sort
 * @param sortBy - Field to sort by (must be a key of Document)
 * @param sortOrder - Sort order ('asc' or 'desc')
 * @returns Sorted array of documents
 */
export const sortDocuments = <T extends Document>(
  documents: T[], 
  sortBy: keyof T,
  sortOrder: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...documents].sort((a, b) => {
    // Safely get values, handling potential undefined
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    // Handle undefined/null values - put them at the end
    if (aValue === null || aValue === undefined) {
      return sortOrder === 'asc' ? 1 : -1;
    }
    if (bValue === null || bValue === undefined) {
      return sortOrder === 'asc' ? -1 : 1;
    }
    
    // Handle dates
    const aIsDate = isValidDate(aValue);
    const bIsDate = isValidDate(bValue);
    
    if (aIsDate && bIsDate) {
      try {
        const aDate = new Date(aValue as string | Date).getTime();
        const bDate = new Date(bValue as string | Date).getTime();
        return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
      } catch (e) {
        console.warn('Error parsing dates for sorting', e);
        return 0;
      }
    }
    
    // If one is a date and the other isn't, put the non-date first in ascending order
    if (aIsDate !== bIsDate) {
      return sortOrder === 'asc' 
        ? (aIsDate ? 1 : -1) 
        : (aIsDate ? -1 : 1);
    }
    
    // Convert to string for comparison if values are of different types
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();
    
    // Compare values
    if (aStr < bStr) return sortOrder === 'asc' ? -1 : 1;
    if (aStr > bStr) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
};

// Type guard to check if a value is a date range object
type DateRange = { start?: string | Date; end?: string | Date };
const isDateRange = (value: unknown): value is DateRange => {
  return (
    value !== null &&
    typeof value === 'object' &&
    ('start' in value || 'end' in value)
  );
};

/**
 * Filter documents based on search query and filters
 * @param documents - Array of documents to filter
 * @param searchQuery - Search query string
 * @param filters - Filter object with document properties and values to match
 * @returns Filtered array of documents
 */
// Helper: Normalize a date to start of day
function normalizeStart(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
// Helper: Normalize a date to end of day
function normalizeEnd(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
// Helper: Date filter
function dateInRange(docDate: Date | string | undefined, start?: Date, end?: Date): boolean {
  if (!docDate) return false;
  const docD = normalizeStart(new Date(docDate));
  if (start && docD < normalizeStart(start)) return false;
  if (end && docD > normalizeEnd(end)) return false;
  return true;
}
// Helper: Tag filter (OR logic)
function hasTag(docTags: string[] = [], filterTags: string[] = []) {
  return filterTags.length === 0 || filterTags.some(tag => docTags.includes(tag));
}
// Helper: MimeType filter
function matchesMimeType(docMime: string | undefined, filterType: string) {
  if (!docMime) return false;
  return getMimeTypeCategory(docMime) === filterType;
}

export const filterDocuments = <T extends Document>(
  documents: T[],
  searchQuery: string = '',
  filters: Partial<T> & { dateRange?: DateRange } = {}
): T[] => {
  // Return all documents if no search or filters
  if (!searchQuery.trim() && Object.keys(filters).length === 0) {
    return [...documents];
  }
  
  const searchLower = searchQuery.trim().toLowerCase();
  
  return documents.filter(doc => {
    // Apply search query across name and description
    if (searchLower) {
      const nameMatch = doc.name.toLowerCase().includes(searchLower);
      const descMatch = doc.description && doc.description.toLowerCase().includes(searchLower);
      const matchesSearch = nameMatch || descMatch;
      
      if (!matchesSearch) {
        return false;
      }
    }
    // --- Date filter ---
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      const startDate = start ? new Date(start) : undefined;
      const endDate = end ? new Date(end) : undefined;
      const isInDateRange = dateInRange(doc.updatedAt, startDate, endDate);
      
      if (!isInDateRange) {
        return false;
      }
    }
    // --- MimeType filter ---
    if (filters.mimeType && typeof filters.mimeType === 'string') {
      const docMimeType = doc.mimeType || 'unknown';
      const category = getMimeTypeCategory(docMimeType);
      const matches = category === filters.mimeType;
      
      if (!matches) {
        return false;
      }
    }
    // --- Tag filter ---
    if (filters.tags && Array.isArray(filters.tags)) {
      const docTags = doc.tags || [];
      const hasMatchingTag = filters.tags.length === 0 || 
                           filters.tags.some(tag => docTags.includes(tag));
      
      if (!hasMatchingTag) {
        return false;
      }
    }
    // --- Other primitive filters ---
    for (const [key, value] of Object.entries(filters)) {
      if (['dateRange','mimeType','tags'].includes(key)) continue;
      const docValue = doc[key as keyof T];
      if (value !== undefined && value !== null && value !== '' && docValue !== value) {
        return false;
      }
    }
    return true;
  });
};
