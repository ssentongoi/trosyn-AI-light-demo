/**
 * Document interface representing document data in the application
 */
export interface Document {
  id: string;
  name: string;
  title?: string;
  content?: string;
  path?: string;
  size?: number;
  type?: string;
  mimeType?: string;
  extension?: string;
  description?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  lastModifiedBy?: string;
  isStarred?: boolean;
  isShared?: boolean;
  isDeleted?: boolean;
  tags?: string[];
  metadata?: {
    [key: string]: any;
  };
  permissions?: {
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
  };
}

export interface DocumentOwner {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface DocumentVersion {
  id: string;
  version: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  size: number;
  downloadUrl?: string;
  createdBy: DocumentOwner;
}

export interface DocumentTag {
  id: string;
  name: string;
  color?: string;
}

export interface EnhancedDocument extends Document {
  id: string;
  name: string;
  title: string;
  content?: string;
  description?: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  isStarred?: boolean;
  isShared?: boolean;
  isPublic?: boolean;
  isTrashed?: boolean;
  isSelected?: boolean;
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
    canShare: boolean;
    canDownload: boolean;
  };
  metadata?: Record<string, any>;
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
  date_range?: string;
  [key: string]: any; // Allow additional filter properties
}

export interface DocumentSort {
  field: string;
  order: 'asc' | 'desc';
  direction?: 'asc' | 'desc'; // For backward compatibility
}

export interface DocumentPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DocumentListI18n {
  searchPlaceholder?: string;
  noDocuments?: string;
  loadingDocuments?: string;
  errorLoadingDocuments?: string;
  noSearchResults?: string;
  selectAll?: string;
  deselectAll?: string;
  selectedCount?: string;
  upload?: string;
  newFolder?: string;
  refresh?: string;
  moreActions?: string;
  name?: string;
  size?: string;
  modified?: string;
  type?: string;
  owner?: string;
  status?: string;
  actions?: string;
  firstPage?: string;
  lastPage?: string;
  previousPage?: string;
  nextPage?: string;
  rowsPerPage?: string;
  of?: string;
  filter?: string;
  sort?: string;
  view?: string;
  gridView?: string;
  listView?: string;
  tableView?: string;
  [key: string]: any; // Allow additional i18n keys
}
