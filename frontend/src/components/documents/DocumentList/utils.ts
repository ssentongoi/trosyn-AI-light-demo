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
      if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
      if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'spreadsheet';
      if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentation';
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
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    // Handle undefined/null values - put them at the end
    if (aValue == null) return sortOrder === 'asc' ? 1 : -1;
    if (bValue == null) return sortOrder === 'asc' ? -1 : 1;
    
    // Handle dates
    if (isValidDate(aValue) && isValidDate(bValue)) {
      const aDate = new Date(aValue).getTime();
      const bDate = new Date(bValue).getTime();
      return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
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
      const matchesSearch = 
        doc.name.toLowerCase().includes(searchLower) ||
        (doc.description && doc.description.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) {
        return false;
      }
    }
    
    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      // Skip undefined, null, or empty string values
      if (value === undefined || value === null || value === '') {
        continue;
      }
      
      const docValue = doc[key as keyof T];
      
      // Handle date range filter
      if (key === 'dateRange' && isDateRange(value)) {
        if (!doc.updatedAt) return false;
        
        const docDate = new Date(doc.updatedAt).getTime();
        
        if (value.start) {
          const startDate = new Date(value.start).getTime();
          if (docDate < startDate) return false;
        }
        
        if (value.end) {
          const endDate = new Date(value.end).getTime() + 86400000; // Add 1 day to include the end date
          if (docDate > endDate) return false;
        }
        
        continue;
      }
      
      // Handle MIME type category filter
      if (key === 'mimeType' && typeof value === 'string' && doc.mimeType) {
        const docCategory = getMimeTypeCategory(doc.mimeType);
        if (docCategory !== value) {
          return false;
        }
        continue;
      }
      
      // Handle array filters (e.g., tags)
      if (Array.isArray(value)) {
        if (!Array.isArray(docValue) || value.length === 0) {
          return false;
        }
        
        // Check if all filter values exist in the document's array
        if (!value.every(v => docValue.includes(v))) {
          return false;
        }
        
        continue;
      }
      
      // Handle exact match for primitive values
      if (docValue !== value) {
        return false;
      }
    }
    
    return true;
  });
};
