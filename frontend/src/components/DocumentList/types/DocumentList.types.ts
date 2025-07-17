// Define local types to avoid external dependencies
export interface DocumentOwner {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface DocumentVersion {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  size: number;
  url: string;
  createdBy: DocumentOwner;
}

export interface DocumentTag {
  id: string;
  name: string;
  color?: string;
}

export type SortDirection = 'asc' | 'desc';

export type SortField = keyof Omit<Document, 'content' | 'metadata' | 'owner' | 'lastModifiedBy' | 'tags' | 'versions' | 'permissions'>;

export interface DocumentSort {
  field: SortField;
  direction: SortDirection;
}

export interface DocumentFilter {
  search?: string;
  ownerId?: string;
  mimeType?: string;
  tags?: string[];
  isStarred?: boolean;
  isShared?: boolean;
  isPublic?: boolean;
  isTrashed?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sizeMin?: number;
  sizeMax?: number;
}

export interface Document {
  id: string;
  name: string;
  description?: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  isStarred?: boolean;
  isShared?: boolean;
  isPublic?: boolean;
  isTrashed?: boolean;
  createdAt: string;
  updatedAt: string;
  owner: DocumentOwner;
  lastModifiedBy?: DocumentOwner;
  tags?: DocumentTag[];
  versions?: DocumentVersion[];
  permissions?: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
}

export interface DocumentListProps {
  documents: Document[];
  selectedDocuments?: string[];
  defaultSelectedDocuments?: string[];
  onSelectedDocumentsChange?: (selectedIds: string[]) => void;
  filters?: DocumentFilter;
  defaultFilters?: DocumentFilter;
  onFiltersChange?: (filters: DocumentFilter) => void;
  sort?: DocumentSort;
  defaultSort?: DocumentSort;
  onSortChange?: (sort: DocumentSort) => void;
  loading?: boolean;
  error?: string;
  viewMode?: 'grid' | 'list' | 'table';
  className?: string;
  style?: React.CSSProperties;
}

export interface DocumentFilter {
  search?: string;
  ownerId?: string;
  mimeType?: string;
  tags?: string[];
  isStarred?: boolean;
  isShared?: boolean;
  isPublic?: boolean;
  isTrashed?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sizeMin?: number;
  sizeMax?: number;
}

export interface DocumentListState {
  internalSort: DocumentSort | null;
  internalFilters: DocumentFilter;
  selectedDocuments: string[];
}

export type OnSortChange = (field: SortField, direction: SortDirection) => void;

export type OnSelectAll = (selected: boolean) => void;
