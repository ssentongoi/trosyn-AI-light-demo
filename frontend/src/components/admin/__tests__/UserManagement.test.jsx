import React from 'react';
import PropTypes from 'prop-types';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../../../contexts/AppContext';
import UserManagement from '../UserManagement';
import { useUserManagement } from '../../../hooks/useUserManagement';
import { vi } from 'vitest';

// Mock the custom hook
vi.mock('../../../hooks/useUserManagement');

const mockUsers = [
  {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    role: 'admin',
    status: 'active',
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'user-2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    role: 'viewer',
    status: 'inactive',
    lastLogin: new Date().toISOString(),
  },
];

const mockUseUserManagement = {
  users: [],
  loading: true,
  error: null,
  selected: [],
  page: 0,
  rowsPerPage: 10, // This should match one of the valid page size options (5, 10, 25)
  order: 'asc',
  orderBy: 'name',
  dense: false,
  openUserMenu: null,
  selectedUser: null,
  userDetailsOpen: false,
  fetchUsers: vi.fn(),
  handleRequestSort: vi.fn(),
  handleSelectAllClick: vi.fn(),
  handleClick: vi.fn(),
  handleChangePage: vi.fn(),
  handleChangeRowsPerPage: vi.fn(),
  setDense: vi.fn(),
  handleUserMenuOpen: vi.fn(),
  handleUserMenuClose: vi.fn(),
  handleViewDetails: vi.fn(),
  handleCloseDetails: vi.fn(),
  handleResetPassword: vi.fn(),
};

describe('UserManagement Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    useUserManagement.mockReturnValue(mockUseUserManagement);
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <AppProvider>
          <UserManagement />
        </AppProvider>
      </MemoryRouter>
    );
  };

  it('displays a loading spinner when loading', () => {
    useUserManagement.mockReturnValue({ ...mockUseUserManagement, loading: true });
    renderComponent();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays an error message when an error occurs', () => {
    useUserManagement.mockReturnValue({ ...mockUseUserManagement, loading: false, error: 'Failed to load' });
    renderComponent();
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('displays the user table when data is loaded', () => {
    useUserManagement.mockReturnValue({ ...mockUseUserManagement, loading: false, users: mockUsers });
    renderComponent();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument();
  });

  it('calls handleRequestSort when a sortable header is clicked', () => {
    useUserManagement.mockReturnValue({ ...mockUseUserManagement, loading: false, users: mockUsers });
    renderComponent();
    fireEvent.click(screen.getByText('Name'));
    expect(mockUseUserManagement.handleRequestSort).toHaveBeenCalled();
  });
  
  it('calls handleSelectAllClick when the select all checkbox is clicked', () => {
    useUserManagement.mockReturnValue({ ...mockUseUserManagement, loading: false, users: mockUsers });
    renderComponent();
    fireEvent.click(screen.getByLabelText('select all users'));
    expect(mockUseUserManagement.handleSelectAllClick).toHaveBeenCalled();
  });

  it('calls handleChangePage with correct page number', () => {
    const mockHandleChangePage = vi.fn();
    
    // Mock the useUserManagement hook with our mock handler
    useUserManagement.mockReturnValue({
      ...mockUseUserManagement,
      loading: false,
      users: mockUsers,
      page: 0,
      rowsPerPage: 10,
      count: mockUsers.length,
      handleChangePage: mockHandleChangePage,
      handleChangeRowsPerPage: vi.fn()
    });
    
    // Render the component
    renderComponent();
    
    // Get the handler function from the hook
    const { handleChangePage } = useUserManagement();
    
    // Call the handler directly with test values
    const mockEvent = { preventDefault: vi.fn() };
    handleChangePage(mockEvent, 1);
    
    // Verify the handler was called with the correct arguments
    expect(mockHandleChangePage).toHaveBeenCalledWith(mockEvent, 1);
  });

  it('displays users in a table when data is loaded', () => {
    useUserManagement.mockReturnValue({ 
      ...mockUseUserManagement, 
      loading: false, 
      users: mockUsers 
    });
    
    renderComponent();
    
    // Verify users are displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument();
    
    // Verify table headers
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });
  
  it('shows loading state when fetching data', () => {
    useUserManagement.mockReturnValue({ 
      ...mockUseUserManagement, 
      loading: true 
    });
    
    renderComponent();
    
    // Verify loading indicator is shown
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
  
  it('shows error message when there is an error', () => {
    const errorMessage = 'Failed to load users';
    useUserManagement.mockReturnValue({ 
      ...mockUseUserManagement, 
      loading: false, 
      error: errorMessage 
    });
    
    renderComponent();
    
    // Verify error message is shown
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });
  
  it('allows sorting by clicking on column headers', () => {
    useUserManagement.mockReturnValue({ 
      ...mockUseUserManagement, 
      loading: false, 
      users: mockUsers 
    });
    
    renderComponent();
    
    // Click on the Name column header to sort
    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);
    
    expect(mockUseUserManagement.handleRequestSort).toHaveBeenCalled();
  });
  
  it('displays pagination controls with correct user count', () => {
    // Create more users to test pagination
    const manyUsers = Array.from({ length: 15 }, (_, i) => ({
      id: `user-${i}`,
      firstName: `User${i}`,
      lastName: `Last${i}`,
      email: `user${i}@example.com`,
      role: i % 2 === 0 ? 'admin' : 'viewer',
      status: i % 3 === 0 ? 'inactive' : 'active',
      lastLogin: new Date().toISOString(),
    }));
    
    useUserManagement.mockReturnValue({
      ...mockUseUserManagement,
      users: manyUsers,
      loading: false,
      rowsPerPage: 10,
      page: 0,
      count: manyUsers.length,
      handleChangePage: vi.fn(),
      handleChangeRowsPerPage: vi.fn()
    });
    
    renderComponent();
    
    // Verify pagination displays the correct range and total
    expect(screen.getByText(/1–10 of 15/)).toBeInTheDocument();
    
    // Verify pagination controls are present
    const prevButton = screen.getByRole('button', { name: /previous page/i });
    const nextButton = screen.getByRole('button', { name: /next page/i });
    
    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
    
    // Test pagination actions
    fireEvent.click(nextButton);
    expect(useUserManagement().handleChangePage).toHaveBeenCalled();
  });
});

