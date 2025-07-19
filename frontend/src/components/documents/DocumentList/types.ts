import { Document } from '../../../types/document';

export type SortField = keyof Omit<Document, 'content' | 'metadata' | 'owner' | 'lastModifiedBy' | 'tags' | 'versions' | 'permissions'>;

export interface DocumentFilter {
  type?: string[];
  status?: string[];
  dateRange?: {
    start: Date | null;
    end: Date | null;
  };
  tags?: string[];
  searchQuery?: string;
}

export interface DocumentSort {
  field: SortField;
  order: 'asc' | 'desc';
}

export interface DocumentListProps {
  // Data
  documents?: Document[];
  selectedDocuments?: string[];
  loading?: boolean;
  error?: Error | string | null;
  
  // Pagination
  totalItems?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  
  // Selection
  selectable?: boolean;
  multiSelect?: boolean;
  onSelectedDocumentsChange?: (selectedIds: string[]) => void;
  
  // Sorting
  sortBy?: SortField;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sort: { field: SortField; order: 'asc' | 'desc' }) => void;
  
  // Filtering
  filters?: DocumentFilter;
  onFilterChange?: (filters: DocumentFilter) => void;
  
  // Actions
  onDocumentClick?: (document: Document) => void;
  onDocumentDoubleClick?: (document: Document) => void;
  onDocumentDelete?: (documentId: string) => Promise<void>;
  onDocumentDownload?: (document: Document) => void;
  onDocumentShare?: (document: Document) => void;
  onDocumentEdit?: (document: Document) => void;
  onDocumentStar?: (document: Document, isStarred: boolean) => void;
  
  // UI Customization
  emptyState?: React.ReactNode;
  showUploadButton?: boolean;
  showNewFolderButton?: boolean;
  showToolbar?: boolean;
  showSearch?: boolean;
  showFilters?: boolean;
  showSort?: boolean;
  showViewToggle?: boolean;
  showMoreActionsButton?: boolean;
  rowActions?: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: (document?: Document) => void;
    disabled?: boolean | ((document?: Document) => boolean);
  }>;
  
  // Styling
  className?: string;
  style?: React.CSSProperties;
}

export interface DocumentListState {
  // Selection
  selectedDocuments: Set<string>;
  lastSelectedIndex: number | null;
  
  // UI State
  contextMenu: {
    anchorEl: HTMLElement | null;
    document: Document | null;
  };
  
  // Local filtering/sorting/pagination
  localFilters: DocumentFilter;
  localSort: DocumentSort;
  localPage: number;
  localPageSize: number;
  
  // Loading states
  isDeleting: Set<string>;
  isDownloading: Set<string>;
  isStarring: Set<string>;
  
  // Error states
  error: Error | string | null;
}
