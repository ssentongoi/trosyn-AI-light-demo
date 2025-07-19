/**
 * Document interface representing document data in the application
 */
// Base document properties that are common to all document types
export interface BaseDocument {
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
  isStarred?: boolean;
  isShared?: boolean;
  isDeleted?: boolean;
  metadata?: {
    [key: string]: any;
  };
  permissions?: {
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
  };
}

// Document with string tags (basic document type)
export interface Document extends BaseDocument {
  tags?: string[];
  lastModifiedBy?: string;
}

// Document with rich tag objects
export interface DocumentWithRichTags extends BaseDocument {
  tags?: DocumentTag[];
  lastModifiedBy?: DocumentOwner;
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

export interface EnhancedDocument extends Omit<DocumentWithRichTags, 'tags' | 'lastModifiedBy'> {
  // Core document properties (overrides from DocumentWithRichTags)
  id: string;
  name: string;
  title: string;
  content?: string;
  description?: string;
  mimeType: string;
  size: number;
  url: string;
  
  // Additional enhanced properties
  thumbnailUrl?: string;
  versions: DocumentVersion[];
  tags: DocumentTag[];  
  sharedWith: Array<{
    id: string;
    name: string;
    email: string;
    role: 'viewer' | 'editor' | 'owner';
    avatar?: string;
  }>;
  isPinned?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
  status?: 'draft' | 'published' | 'archived' | 'deleted';
  lastOpenedAt?: string | Date;
  lastModifiedAt?: string | Date;
  createdBy: DocumentOwner;
  updatedBy?: DocumentOwner;
  parentId?: string;
  children?: EnhancedDocument[];
  breadcrumbs?: Array<{ id: string; name: string }>;
  version: number;
  isCurrentVersion: boolean;
  changeLog?: string;
  downloadCount: number;
  viewCount: number;
  shareCount: number;
  commentsCount: number;
  tasksCount: number;
  completedTasksCount: number;
  isTemplate: boolean;
  templateId?: string;
  relatedDocuments?: string[];
  relatedTickets?: string[];
  customFields?: {
    [key: string]: any;
  };
  accessControl?: {
    canView: string[];
    canEdit: string[];
    canDelete: string[];
    canShare: string[];
  };
  retentionPolicy?: {
    expiresAt?: string | Date;
    isPermanent: boolean;
    holdPolicy?: 'legal' | 'regulatory' | 'business' | 'none';
  };
  workflow?: {
    status: string;
    step: string;
    assignee?: string;
    dueDate?: string | Date;
  };
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

// Define all possible sortable fields
export type SortableField = 
  | 'id' 
  | 'createdAt' 
  | 'name' 
  | 'title' 
  | 'date'
  | 'url' 
  | 'size' 
  | 'description' 
  | 'mimeType' 
  | 'updatedAt' 
  | 'isStarred' 
  | 'isShared' 
  | 'isPublic' 
  | 'isTrashed' 
  | 'thumbnailUrl';

export interface DocumentSort {
  field: SortableField;
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
