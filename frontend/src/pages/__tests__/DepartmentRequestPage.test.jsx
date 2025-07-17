import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import DepartmentRequestPage from '../DepartmentRequestPage';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Mock the child components to isolate the page component testing
vi.mock('../../components/department/DepartmentRequestDialog', () => ({
  __esModule: true,
  default: ({ open, onClose }) => (
    <div data-testid="mock-request-dialog">
      {open ? 'Dialog Open' : 'Dialog Closed'}
      <button onClick={onClose}>Close Dialog</button>
    </div>
  ),
}));

vi.mock('../../components/department/DepartmentRequestForm', () => ({
  __esModule: true,
  default: ({ open, onClose, onSubmit }) => (
    <div data-testid="mock-request-form">
      {open ? 'Form Open' : 'Form Closed'}
      <button onClick={onClose}>Close Form</button>
      <button onClick={() => onSubmit({ title: 'Test Request', description: 'Test Description' })}>
        Submit Form
      </button>
    </div>
  ),
}));

// Mock data for testing
const mockRequests = [
  {
    id: 'REQ-2023-001',
    title: 'Test Request 1',
    description: 'Test Description 1',
    status: 'pending',
    priority: 'high',
    type: 'equipment',
    requester: { id: 1, name: 'John Doe', email: 'john.doe@example.com', avatar: 'JD' },
    department: { id: 101, name: 'Engineering' },
    created_at: new Date('2023-10-15T10:30:00'),
    updated_at: new Date('2023-10-15T10:30:00'),
    attachments: []
  },
  {
    id: 'REQ-2023-002',
    title: 'Test Request 2',
    description: 'Test Description 2',
    status: 'approved',
    priority: 'medium',
    type: 'personnel',
    requester: { id: 2, name: 'Jane Smith', email: 'jane.smith@example.com', avatar: 'JS' },
    department: { id: 102, name: 'HR' },
    created_at: new Date('2023-10-16T11:30:00'),
    updated_at: new Date('2023-10-16T11:30:00'),
    attachments: []
  }
];

// Create a theme for testing
const theme = createTheme();

// Test wrapper component
const renderWithProviders = (ui) => {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </ThemeProvider>
  );
};

describe('DepartmentRequestPage', () => {
  beforeEach(() => {
    // Mock the setTimeout to immediately resolve
    vi.useFakeTimers();
    
    // Mock the console.error to avoid polluting test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test('renders loading state initially', () => {
    renderWithProviders(<DepartmentRequestPage />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Department Requests')).toBeInTheDocument();
  });

  test('renders requests after loading', async () => {
    renderWithProviders(<DepartmentRequestPage />);
    
    // Fast-forward timers to resolve the mock data loading
    vi.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Check if the table is rendered with headers
    expect(screen.getByText('Request ID')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  test('opens new request form when New Request button is clicked', async () => {
    renderWithProviders(<DepartmentRequestPage />);
    
    // Fast-forward timers to resolve the mock data loading
    vi.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Click the New Request button
    fireEvent.click(screen.getByText('New Request'));
    
    // Check if the form dialog is opened
    expect(screen.getByTestId('mock-request-form')).toHaveTextContent('Form Open');
    
    // Close the form
    fireEvent.click(screen.getByText('Close Form'));
    
    // Check if the form dialog is closed
    expect(screen.getByTestId('mock-request-form')).toHaveTextContent('Form Closed');
  });

  test('submits new request form successfully', async () => {
    renderWithProviders(<DepartmentRequestPage />);
    
    // Fast-forward timers to resolve the mock data loading
    vi.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Click the New Request button
    fireEvent.click(screen.getByText('New Request'));
    
    // Submit the form
    fireEvent.click(screen.getByText('Submit Form'));
    
    // Check if the success message is shown (via snackbar)
    await waitFor(() => {
      expect(screen.getByText('Request submitted successfully')).toBeInTheDocument();
    });
  });

  test('filters requests when search input changes', async () => {
    renderWithProviders(<DepartmentRequestPage />);
    
    // Fast-forward timers to resolve the mock data loading
    vi.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Type in the search box
    const searchInput = screen.getByPlaceholderText('Search requests...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    // Check if the search query is applied
    expect(searchInput.value).toBe('test');
  });

  test('changes tab when tab is clicked', async () => {
    renderWithProviders(<DepartmentRequestPage />);
    
    // Fast-forward timers to resolve the mock data loading
    vi.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Click the Pending tab
    fireEvent.click(screen.getByText('Pending'));
    
    // Check if the Pending tab is selected
    expect(screen.getByText('Pending').closest('button')).toHaveAttribute('aria-selected', 'true');
  });
});
