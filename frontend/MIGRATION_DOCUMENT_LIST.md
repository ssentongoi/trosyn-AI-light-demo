# DocumentList Component Migration Guide

## Overview
This document outlines the changes made during the refactoring of the DocumentList component and provides guidance for updating existing code that uses this component.

## Breaking Changes

### 1. Component Structure
- The monolithic `DocumentList` component has been split into smaller, more maintainable components:
  - `DocumentTable`: Handles document display and selection
  - `DocumentToolbar`: Search, filter, and action controls
  - `DocumentPagination`: Pagination controls

### 2. Props Changes
- The component props have been reorganized for better type safety and maintainability
- Some prop names have been updated for consistency
- Event handlers have been simplified and standardized

### 3. State Management
- Internal state management has been simplified
- More control is given to parent components for better integration

## Migration Steps

### 1. Update Imports

Before:
```tsx
import DocumentList from '../components/documents/DocumentList';
import { EnhancedDocument } from '../components/documents/DocumentList';
```

After:
```tsx
import { DocumentList } from '../components/documents/DocumentList';
import type { Document } from '../types/document';
```

### 2. Update Component Usage

Before:
```tsx
<DocumentList
  documents={documents}
  loading={isLoading}
  error={error}
  selectedDocuments={selectedDocuments}
  onDocumentSelect={handleSelectDocuments}
  onDocumentAction={handleDocumentAction}
  // ... many other props
/>
```

After:
```tsx
<DocumentList
  documents={documents}
  loading={isLoading}
  error={error ? new Error(typeof error === 'string' ? error : 'Failed to load documents') : null}
  selectedDocuments={selectedDocuments}
  onSelectedDocumentsChange={handleSelectDocuments}
  onDocumentClick={handleDocumentClick}
  onDocumentDoubleClick={handleDocumentDoubleClick}
  onDocumentAction={handleDocumentAction}
  pagination={{
    page,
    pageSize,
    total: totalCount,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange
  }}
  sort={{
    field: sort.field,
    order: sort.direction,
    onSortChange: handleSortChange
  }}
  filters={filters}
  onFiltersChange={handleFiltersChange}
  // ... other props as needed
/>
```

### 3. Event Handlers

Update your event handlers to match the new API:

```tsx
// Before
const handleSelectDocuments = (selectedIds: string[]) => {
  setSelectedDocuments(selectedIds);
};

const handleDocumentAction = (action: string, document: EnhancedDocument) => {
  // ...
};

// After
const handleSelectDocuments = (selectedIds: Set<string>) => {
  setSelectedDocuments(Array.from(selectedIds));
};

const handleDocumentClick = (document: Document) => {
  // Handle single click
};

const handleDocumentDoubleClick = (document: Document) => {
  // Handle double click
};

const handleDocumentAction = (action: string, document: Document) => {
  // Handle specific actions
};
```

## New Features

### 1. Improved Type Safety
- Better TypeScript types for all props and state
- More precise event handler types

### 2. Performance Optimizations
- Memoized components to prevent unnecessary re-renders
- Virtualized table for better performance with large datasets

### 3. Better Customization
- More control over the UI and behavior
- Better support for theming and styling

## Testing

New test files have been added for all components:
- `DocumentList/__tests__/index.test.tsx`
- `DocumentList/__tests__/DocumentTable.test.tsx`
- `DocumentList/__tests__/DocumentToolbar.test.tsx`
- `DocumentList/__tests__/DocumentPagination.test.tsx`
- `DocumentList/__tests__/utils.test.ts`

Run the tests to ensure everything is working as expected:

```bash
npm test
```

## Rollback Plan

If you encounter any issues, you can rollback to the previous version by:

1. Reverting the changes in the `components/documents/DocumentList` directory
2. Restoring the original `DocumentList.tsx` file
3. Updating any imports that were changed

## Support

For any questions or issues, please contact the development team or open an issue in the repository.
