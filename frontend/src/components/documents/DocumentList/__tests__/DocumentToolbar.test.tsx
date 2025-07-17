import { vi, describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import DocumentToolbar from '../components/DocumentToolbar';
import { DocumentFilter } from '../types';

// Add type definitions for test runner
type TestingLibraryMatchers<T, U> = {
  toBeInTheDocument(): void;
  toHaveBeenCalled(): void;
  toHaveBeenCalledTimes(count: number): void;
  toHaveBeenCalledWith(...args: any[]): void;
  toHaveBeenLastCalledWith(...args: any[]): void;
  toHaveBeenNthCalledWith(nth: number, ...args: any[]): void;
  toHaveReturned(): void;
  toHaveReturnedTimes(times: number): void;
  toHaveReturnedWith(value: any): void;
  toHaveLastReturnedWith(value: any): void;
  toHaveNthReturnedWith(nth: number, value: any): void;
  toHaveLength(length: number): void;
  toHaveProperty(property: string, value?: any): void;
  toBe(value: any): void;
  toBeCloseTo(value: number, numDigits?: number): void;
  toBeDefined(): void;
  toBeFalsy(): void;
  toBeGreaterThan(value: number | bigint): void;
  toBeGreaterThanOrEqual(value: number | bigint): void;
  toBeInstanceOf(Class: any): void;
  toBeLessThan(value: number | bigint): void;
  toBeLessThanOrEqual(value: number | bigint): void;
  toBeNaN(): void;
  toBeNull(): void;
  toBeTruthy(): void;
  toBeUndefined(): void;
  toContain(item: any): void;
  toContainEqual(item: any): void;
  toEqual(value: any): void;
  toMatch(regex: RegExp | string): void;
  toMatchObject(object: object): void;
  toMatchSnapshot(): void;
  toStrictEqual(value: any): void;
  toThrow(error?: Error | string | RegExp): void;
  toThrowError(error?: Error | string | RegExp): void;
  toThrowErrorMatchingSnapshot(): void;
};

declare global {
  namespace Vi {
    interface Assertion<T = any> extends TestingLibraryMatchers<T, void> {}
  }
}

const theme = createTheme();

describe('DocumentToolbar', () => {
  const defaultProps = {
    selectedCount: 0,
    onFilterChange: vi.fn(),
    filters: {},
    onUploadClick: vi.fn(),
    onCreateFolderClick: vi.fn(),
    rowActions: [],
    viewMode: 'list' as const,
    onViewModeChange: vi.fn(),
  };

  const renderComponent = (props = {}) => {
    return render(
      <ThemeProvider theme={theme}>
        <DocumentToolbar {...defaultProps} {...props} />
      </ThemeProvider>
    );
  };

  it('renders search input', () => {
    renderComponent();
    expect(screen.getByPlaceholderText('Search documents...')).toBeInTheDocument();
  });

  it('triggers search on input change', () => {
    const onFilterChange = vi.fn();
    renderComponent({ onFilterChange });
    
    const searchInput = screen.getByPlaceholderText('Search documents...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    expect(onFilterChange).toHaveBeenCalledWith({
      searchQuery: 'test'
    });
  });

  it('shows selected count when items are selected', () => {
    renderComponent({ selectedCount: 3 });
    expect(screen.getByText('3 selected')).toBeInTheDocument();
    
    // Check that the count is wrapped in Typography with correct styling
    const typography = screen.getByText('3 selected').closest('p');
    expect(typography).toHaveStyle({ marginRight: '8px' });
  });

  it('shows upload and new folder buttons when no items are selected', () => {
    const onUploadClick = vi.fn();
    const onCreateFolderClick = vi.fn();
    
    renderComponent({ onUploadClick, onCreateFolderClick });
    
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    const newFolderButton = screen.getByRole('button', { name: /new folder/i });
    
    expect(uploadButton).toBeInTheDocument();
    expect(newFolderButton).toBeInTheDocument();
    
    fireEvent.click(uploadButton);
    expect(onUploadClick).toHaveBeenCalled();
    
    fireEvent.click(newFolderButton);
    expect(onCreateFolderClick).toHaveBeenCalled();
  });

  it('shows document actions when items are selected', () => {
    const rowActions = [
      {
        label: 'Download',
        icon: <span>📥</span>,
        onClick: vi.fn(),
      },
      {
        label: 'Share',
        icon: <span>🔗</span>,
        onClick: vi.fn(),
      },
    ];
    
    renderComponent({ 
      selectedCount: 2,
      rowActions,
    });
    
    // Check if action buttons are rendered
    const downloadButton = screen.getByLabelText('Download');
    const shareButton = screen.getByLabelText('Share');
    
    expect(downloadButton).toBeInTheDocument();
    expect(shareButton).toBeInTheDocument();
  });

  it('toggles between grid, list, and table views', () => {
    const onViewModeChange = vi.fn();
    const { rerender } = renderComponent({ onViewModeChange });
    
    // Get view toggle buttons
    const gridButton = screen.getByLabelText('Grid view');
    const listButton = screen.getByLabelText('List view');
    const tableViewButton = screen.getByLabelText('Table view');
    
    // List view should be active by default - check for the selected background color
    expect(listButton.closest('button')).toHaveStyle(`background-color: ${theme.palette.action.selected}`);
    
    // Click grid view
    fireEvent.click(gridButton);
    expect(onViewModeChange).toHaveBeenCalledWith('grid');
    
    // Re-render with grid view active
    rerender(
      <ThemeProvider theme={theme}>
        <DocumentToolbar 
          {...defaultProps} 
          onViewModeChange={onViewModeChange} 
          viewMode="grid"
        />
      </ThemeProvider>
    );
    
    // Now grid view should be active - check for the selected background color
    expect(screen.getByLabelText('Grid view').closest('button')).toHaveStyle(
      `background-color: ${theme.palette.action.selected}`
    );
    
    // Test table view
    fireEvent.click(screen.getByLabelText('Table view'));
    expect(onViewModeChange).toHaveBeenCalledWith('table');
    
    // Re-render with table view active
    rerender(
      <ThemeProvider theme={theme}>
        <DocumentToolbar 
          {...defaultProps} 
          onViewModeChange={onViewModeChange} 
          viewMode="table" 
        />
      </ThemeProvider>
    );
    
    // Now table view should be active
    expect(screen.getByLabelText('Table view').closest('button')).toHaveStyle(
      `background-color: ${theme.palette.action.selected}`
    );
  });

  it('opens and closes filter menu', () => {
    renderComponent();
    
    // Click filter button
    const filterButton = screen.getByLabelText('Filter');
    fireEvent.click(filterButton);
    
    // Check if menu is open
    expect(screen.getByRole('menu')).toBeInTheDocument();
    
    // Click a menu item
    const menuItem = screen.getByText('Date modified: Newest first');
    fireEvent.click(menuItem);
    
    // Menu should be closed after selection
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens and closes the filter menu', () => {
    const onFilterChange = vi.fn();
    renderComponent({ onFilterChange });
    
    // Open filter menu
    const filterButton = screen.getByLabelText('Filter');
    fireEvent.click(filterButton);
    
    // Verify menu is open
    expect(screen.getByRole('menu')).toBeInTheDocument();
    
    // Click a menu item (currently menu items only close the menu)
    const menuItem = screen.getByText('Date modified: Newest first');
    fireEvent.click(menuItem);
    
    // Verify menu is closed
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    
    // Verify no filter changes were made (current implementation)
    expect(onFilterChange).not.toHaveBeenCalled();
  });

  it('shows more actions menu', () => {
    const rowActions = [
      {
        label: 'Custom Action',
        icon: <span>⭐</span>,
        onClick: vi.fn(),
      },
    ];
    
    renderComponent({ rowActions });
    
    // Open more actions menu
    const moreButton = screen.getByLabelText('More actions');
    fireEvent.click(moreButton);
    
    // Check if menu is open with custom action
    expect(screen.getByText('Custom Action')).toBeInTheDocument();
    
    // Click the action
    fireEvent.click(screen.getByText('Custom Action'));
    expect(rowActions[0].onClick).toHaveBeenCalled();
  });
});
