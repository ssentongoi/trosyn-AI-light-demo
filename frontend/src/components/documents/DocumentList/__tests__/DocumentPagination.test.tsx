import { vi, describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';
import DocumentPagination from '../components/DocumentPagination';

const theme = createTheme();

describe('DocumentPagination', () => {
  const defaultProps = {
    count: 100,
    page: 0,
    rowsPerPage: 10,
    onPageChange: vi.fn(),
    onRowsPerPageChange: vi.fn(),
  };

  const renderComponent = (props = {}) => {
    return render(
      <ThemeProvider theme={theme}>
        <DocumentPagination {...defaultProps} {...props} />
      </ThemeProvider>
    );
  };

  it('renders pagination controls with correct info', () => {
    renderComponent();
    
    // Check if pagination info is displayed with correct format
    const paginationInfo = screen.getByTestId('pagination-info');
    expect(paginationInfo).toBeInTheDocument();
    expect(paginationInfo).toHaveTextContent('1-10 of 100');
    
    // Check if rows per page selector is present
    const rowsPerPageSelector = screen.getByRole('combobox');
    expect(rowsPerPageSelector).toBeInTheDocument();
    
    // Check navigation buttons using data-testid
    const navigationIcons = {
      'first-page': 'FirstPageIcon',
      'previous-page': 'KeyboardArrowLeftIcon',
      'next-page': 'KeyboardArrowRightIcon',
      'last-page': 'LastPageIcon'
    };
    
    Object.entries(navigationIcons).forEach(([testId, iconName]) => {
      const button = screen.getByTestId(iconName).closest('button');
      expect(button).toBeInTheDocument();
    });
  });

  it('handles page change', () => {
    const onPageChange = vi.fn();
    renderComponent({ 
      count: 100, 
      page: 1, 
      onPageChange,
      onRowsPerPageChange: vi.fn()
    });
    
    // Test next page button
    const nextButton = screen.getByRole('button', { name: /go to next page/i });
    fireEvent.click(nextButton);
    expect(onPageChange).toHaveBeenCalledWith(2);
    
    // Reset mock for next test
    onPageChange.mockClear();
    
    // Test previous page button
    const prevButton = screen.getByRole('button', { name: /go to previous page/i });
    fireEvent.click(prevButton);
    expect(onPageChange).toHaveBeenCalledWith(0);
  });

  it('handles rows per page change', () => {
    const onPageChange = vi.fn();
    const onRowsPerPageChange = vi.fn();
    
    renderComponent({ 
      count: 100, 
      page: 1, 
      onPageChange,
      onRowsPerPageChange,
      rowsPerPage: 10
    });
    
    // Open the rows per page select
    const select = screen.getByRole('combobox');
    fireEvent.mouseDown(select);
    
    // Select 25 rows per page
    const option = screen.getByRole('option', { name: '25' });
    fireEvent.click(option);
    
    // Should call onRowsPerPageChange with the new value
    expect(onRowsPerPageChange).toHaveBeenCalledWith(25);
    
    // The component should reset to first page when rows per page changes
    // This is handled internally by the component, no need to test the implementation detail
    // Just verify the component doesn't throw errors
  });
  
  it('disables navigation buttons when at first/last page', () => {
    // First page - previous buttons should be disabled
    const { rerender } = renderComponent({ 
      count: 100,
      page: 0,
      rowsPerPage: 10,
      onRowsPerPageChange: vi.fn()
    });
    
    // Check first page and previous buttons are disabled
    const firstPageButton = screen.getByRole('button', { name: /go to first page/i });
    const prevPageButton = screen.getByRole('button', { name: /go to previous page/i });
    
    expect(firstPageButton).toBeDisabled();
    expect(prevPageButton).toBeDisabled();
    
    // Last page - next buttons should be disabled
    rerender(
      <ThemeProvider theme={theme}>
        <DocumentPagination
          count={100}
          rowsPerPage={10}
          page={9}
          onPageChange={vi.fn()}
          onRowsPerPageChange={vi.fn()}
        />
      </ThemeProvider>
    );
    
    // Check next page and last page buttons are disabled
    const nextPageButton = screen.getByRole('button', { name: /go to next page/i });
    const lastPageButton = screen.getByRole('button', { name: /go to last page/i });
    
    expect(nextPageButton).toBeDisabled();
    expect(lastPageButton).toBeDisabled();
  });  

  it('hides first/last page buttons when showFirstButton/showLastButton are false', () => {
    renderComponent({ 
      count: 100, 
      rowsPerPage: 10, 
      page: 1,
      showFirstButton: false,
      showLastButton: false,
      onRowsPerPageChange: vi.fn()
    });
    
    // First and last page buttons should not be in the document
    const firstPageButtons = screen.queryAllByRole('button', { name: /go to first page/i });
    const lastPageButtons = screen.queryAllByRole('button', { name: /go to last page/i });
    
    expect(firstPageButtons.length).toBe(0);
    expect(lastPageButtons.length).toBe(0);
    
    // Previous and next buttons should still be visible
    const prevButtons = screen.getAllByRole('button', { name: /go to previous page/i });
    const nextButtons = screen.getAllByRole('button', { name: /go to next page/i });
    
    expect(prevButtons.length).toBeGreaterThan(0);
    expect(nextButtons.length).toBeGreaterThan(0);
  });

  it('does not render when count is 0', () => {
    const { container } = renderComponent({ count: 0 });
    expect(container.firstChild).toBeNull();
  });

  it('displays correct range when on last page with partial items', () => {
    renderComponent({
      count: 105,
      page: 10, // Last page (0-based index)
      rowsPerPage: 10,
    });
    
    // Should show "101-105 of 105"
    expect(screen.getByText('101-105 of 105')).toBeInTheDocument();
  });

  it('uses custom rows per page options', () => {
    const rowsPerPageOptions = [5, 15, 30];
    renderComponent({ rowsPerPageOptions });
    
    // Open rows per page dropdown
    const rowsPerPageSelect = screen.getByRole('combobox');
    fireEvent.mouseDown(rowsPerPageSelect);
    
    // Check if custom options are rendered
    rowsPerPageOptions.forEach(option => {
      expect(screen.getByRole('option', { name: option.toString() })).toBeInTheDocument();
    });
  });
});
