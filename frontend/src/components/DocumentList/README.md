# DocumentList Component

A highly customizable and feature-rich document list component for React applications, built with Material-UI and TypeScript.

## Features

- 📁 Multiple view modes: Table, Grid, and List views
- 🔍 Built-in search and filtering
- 🔄 Sorting by any field
- ✅ Multi-select with shift-select support
- ⭐ Star/favorite documents
- 📱 Responsive design
- ♿ Accessible (WAI-ARIA compliant)
- 🎨 Customizable appearance
- 📦 Tree-shakeable (only bundle what you use)
- 🧪 Fully typed with TypeScript

## Installation

```bash
# With npm
npm install @your-org/document-list

# With yarn
yarn add @your-org/document-list
```

## Basic Usage

```tsx
import { DocumentList } from '@your-org/document-list';

const MyDocuments = () => {
  const [documents, setDocuments] = React.useState([
    {
      id: '1',
      name: 'Project Proposal.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 24576,
      updatedAt: '2023-05-15T10:30:00Z',
      owner: { id: 'user1', name: 'John Doe' },
      isStarred: true,
      isShared: true,
    },
    // More documents...
  ]);

  const handleDocumentClick = (doc) => {
    console.log('Document clicked:', doc);
  };

  return (
    <DocumentList
      documents={documents}
      onDocumentClick={handleDocumentClick}
      viewMode="table"
    />
  );
};
```

## Props

### Data

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `documents` | `Document[]` | `[]` | Array of document objects to display |
| `loading` | `boolean` | `false` | Show loading state |
| `error` | `string \| Error` | - | Error message to display |

### Selection

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `selectedDocuments` | `string[]` | - | Array of selected document IDs (controlled) |
| `defaultSelectedDocuments` | `string[]` | `[]` | Initial selected document IDs (uncontrolled) |
| `onSelectedDocumentsChange` | `(ids: string[]) => void` | - | Callback when selection changes |
| `selectable` | `boolean` | `true` | Enable row selection |
| `multiSelect` | `boolean` | `true` | Allow multiple selection |

### View Options

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `viewMode` | `'table' \| 'grid' \| 'list'` | `'table'` | Layout mode |
| `onViewModeChange` | `(mode: string) => void` | - | Callback when view mode changes |
| `showThumbnails` | `boolean` | `true` | Show document thumbnails |
| `showFileIcons` | `boolean` | `true` | Show file type icons |
| `showFileSizes` | `boolean` | `true` | Show file sizes |
| `showLastModified` | `boolean` | `true` | Show last modified date |
| `showOwners` | `boolean` | `true` | Show document owners |
| `showSharingStatus` | `boolean` | `true` | Show sharing status |
| `showTags` | `boolean` | `true` | Show document tags |
| `showStarToggle` | `boolean` | `true` | Show star/favorite toggle |
| `showToolbar` | `boolean` | `true` | Show the toolbar with search and actions |
| `showSearch` | `boolean` | `true` | Show search field |
| `showFilters` | `boolean` | `true` | Show filter controls |
| `showSort` | `boolean` | `true` | Show sort controls |
| `showViewToggle` | `boolean` | `true` | Show view mode toggle |
| `showUploadButton` | `boolean` | `true` | Show upload button |
| `showNewFolderButton` | `boolean` | `true` | Show new folder button |
| `showRefreshButton` | `boolean` | `true` | Show refresh button |
| `showStatusBar` | `boolean` | `false` | Show status bar with item count |

### Event Handlers

| Prop | Type | Description |
|------|------|-------------|
| `onDocumentClick` | `(doc: Document) => void` | When a document is clicked |
| `onDocumentDoubleClick` | `(doc: Document) => void` | When a document is double-clicked |
| `onDocumentStar` | `(doc: Document, isStarred: boolean) => void` | When a document is starred/unstarred |
| `onDocumentDelete` | `(doc: Document) => void` | When delete action is triggered |
| `onDocumentDownload` | `(doc: Document) => void` | When download action is triggered |
| `onDocumentShare` | `(doc: Document) => void` | When share action is triggered |
| `onDocumentEdit` | `(doc: Document) => void` | When edit action is triggered |
| `onUpload` | `() => void` | When upload button is clicked |
| `onNewFolder` | `() => void` | When new folder button is clicked |
| `onRefresh` | `() => void` | When refresh button is clicked |

### Filtering & Sorting

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `filters` | `DocumentFilter` | `{}` | Active filters (controlled) |
| `defaultFilters` | `DocumentFilter` | `{}` | Initial filters (uncontrolled) |
| `onFiltersChange` | `(filters: DocumentFilter) => void` | - | When filters change |
| `sort` | `DocumentSort` | - | Active sort (controlled) |
| `defaultSort` | `DocumentSort` | `{ field: 'updatedAt', direction: 'desc' }` | Initial sort (uncontrolled) |
| `onSortChange` | `(sort: DocumentSort) => void` | - | When sort changes |

### Styling

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS class name |
| `style` | `React.CSSProperties` | - | Inline styles |
| `classes` | `object` | - | Override or extend the styles |
| `sx` | `SxProps` | - | MUI system props |

### Internationalization

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `i18n` | `object` | - | Customize text labels |

## Hooks

### useDocumentSelection

Manage document selection state.

```tsx
import { useDocumentSelection } from '@your-org/document-list';

const { 
  selectedDocuments, 
  toggleSelection, 
  selectAll, 
  clearSelection,
  isSelected,
  selectedCount 
} = useDocumentSelection(
  controlledSelected,   // Optional: Controlled selected IDs
  defaultSelected,      // Optional: Default selected IDs
  onSelectedChange      // Optional: Callback when selection changes
);
```

### useDocumentFilters

Manage document filters.

```tsx
import { useDocumentFilters } from '@your-org/document-list';

const { 
  filters, 
  updateFilter, 
  resetFilters 
} = useDocumentFilters(initialFilters);
```

### useDocumentSorting

Manage document sorting.

```tsx
import { useDocumentSorting } from '@your-org/document-list';

const { 
  sort, 
  toggleSort, 
  resetSort 
} = useDocumentSorting(initialSort);
```

## Customization

### Custom Renderers

You can customize how documents are rendered by providing custom renderers:

```tsx
<DocumentList
  documents={documents}
  renderDocument={(document) => (
    <div>
      <h3>{document.name}</h3>
      <p>{document.description}</p>
    </div>
  )}
/>
```

### Theming

The component uses your MUI theme. You can customize the styles:

```jsx
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  components: {
    MuiDocumentList: {
      styleOverrides: {
        root: {
          // Your custom styles
        },
      },
    },
  },
});
```

## Accessibility

The component follows WAI-ARIA patterns for data tables and supports:

- Keyboard navigation
- Screen reader announcements
- Proper ARIA attributes
- Focus management

## Performance

The component is optimized for performance with:

- Virtualized rendering for large lists
- Memoized components
- Efficient re-renders
- Lazy loading of assets

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- IE 11 (with polyfills)

## License

MIT
