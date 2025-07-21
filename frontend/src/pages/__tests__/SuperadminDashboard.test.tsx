import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { SnackbarProvider } from 'notistack';
import SuperadminDashboard from '../SuperadminDashboard';

// Mock the AuthContext
const mockAuth = {
  currentUser: {
    uid: 'test-superadmin-123',
    email: 'superadmin@example.com',
    displayName: 'Super Admin User',
    role: 'superadmin',
  },
};

// Mock the useAuth hook
jest.mock('../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../contexts/AuthContext'),
  useAuth: () => mockAuth,
}));

// Mock the useCompanies hook
const mockCompanies = [
  { id: '1', name: 'Company A', status: 'active' },
  { id: '2', name: 'Company B', status: 'pending' },
  { id: '3', name: 'Company C', status: 'inactive' },
];

const mockUseCompanies = {
  companies: mockCompanies,
  loading: false,
  error: null,
  createCompany: jest.fn().mockResolvedValue({ id: 'new-company' }),
  updateCompany: jest.fn().mockResolvedValue({}),
  deleteCompany: jest.fn().mockResolvedValue({}),
};

jest.mock('../../hooks/useCompanies', () => ({
  __esModule: true,
  default: () => mockUseCompanies,
}));

// Mock child components
jest.mock('../../components/StatCard', () => ({
  __esModule: true,
  default: ({ title, value, description }: { title: string; value: string | number; description: string }) => (
    <div data-testid="stat-card">
      <h3>{title}</h3>
      <div>{value}</div>
      <div>{description}</div>
    </div>
  ),
}));

jest.mock('../../components/CompaniesTable', () => ({
  __esModule: true,
  default: () => <div data-testid="companies-table">Companies Table Component</div>,
}));

describe('SuperadminDashboard', () => {
  const renderComponent = () => {
    return render(
      <Router>
        <SnackbarProvider maxSnack={3}>
          <AuthProvider>
            <SuperadminDashboard />
          </AuthProvider>
        </SnackbarProvider>
      </Router>
    );
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  it('renders the superadmin dashboard with stats and companies table', () => {
    renderComponent();
    
    // Check if the dashboard title is rendered
    expect(screen.getByText('Superadmin Dashboard')).toBeInTheDocument();
    
    // Check if stat cards are rendered
    const statCards = screen.getAllByTestId('stat-card');
    expect(statCards.length).toBeGreaterThan(0);
    
    // Check if companies table is rendered
    expect(screen.getByTestId('companies-table')).toBeInTheDocument();
  });

  it('displays the correct number of companies in each status', () => {
    renderComponent();
    
    // Check if the stat cards show the correct counts
    const statCards = screen.getAllByTestId('stat-card');
    expect(statCards[0]).toHaveTextContent('Total Companies');
    expect(statCards[0]).toHaveTextContent('3');
    
    expect(statCards[1]).toHaveTextContent('Active Companies');
    expect(statCards[1]).toHaveTextContent('1');
    
    expect(statCards[2]).toHaveTextContent('Inactive Companies');
    expect(statCards[2]).toHaveTextContent('1');
    
    expect(statCards[3]).toHaveTextContent('Pending Approval');
    expect(statCards[3]).toHaveTextContent('1');
  });

  it('shows loading state when companies are being fetched', () => {
    // Mock loading state
    mockUseCompanies.loading = true;
    
    renderComponent();
    
    // Check if loading indicator is shown
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    
    // Reset mock
    mockUseCompanies.loading = false;
  });

  it('shows error message when there is an error fetching companies', () => {
    // Mock error state
    const originalError = console.error;
    console.error = jest.fn();
    
    const errorMessage = 'Failed to load companies';
    mockUseCompanies.error = new Error(errorMessage);
    
    renderComponent();
    
    // Check if error message is shown
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    
    // Reset mocks
    mockUseCompanies.error = null;
    console.error = originalError;
  });

  it('displays the companies table with the correct data', () => {
    renderComponent();
    
    // Check if the companies table is rendered with the correct data
    const companiesTable = screen.getByTestId('companies-table');
    expect(companiesTable).toBeInTheDocument();
    
    // The actual data rendering is tested in the CompaniesTable component's own tests
  });

  it('redirects to login if user is not authenticated', async () => {
    // Mock unauthenticated state
    const originalAuth = { ...mockAuth };
    mockAuth.currentUser = null;
    
    const mockNavigate = jest.fn();
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));
    
    // Mock console.error to avoid error logs
    const originalError = console.error;
    console.error = jest.fn();
    
    renderComponent();
    
    // Check if navigate was called with '/login'
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
    
    // Reset mocks
    mockAuth.currentUser = originalAuth.currentUser;
    console.error = originalError;
  });

  it('displays an error if user is not a superadmin', () => {
    // Mock non-superadmin user
    const originalUser = { ...mockAuth.currentUser };
    mockAuth.currentUser.role = 'admin';
    
    // Mock console.error to avoid error logs
    const originalError = console.error;
    console.error = jest.fn();
    
    renderComponent();
    
    // Check if unauthorized message is shown
    expect(screen.getByText('You do not have permission to access this page')).toBeInTheDocument();
    
    // Reset mocks
    mockAuth.currentUser = originalUser;
    console.error = originalError;
  });
});
