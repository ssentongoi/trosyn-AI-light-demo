import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { SnackbarProvider } from 'notistack';
import AdminDashboard from '../AdminDashboard';

// Mock the AuthContext
const mockAuth = {
  currentUser: {
    uid: 'test-admin-123',
    email: 'admin@example.com',
    displayName: 'Admin User',
    photoURL: '',
  },
  logout: jest.fn().mockResolvedValue(undefined),
};

// Mock the useAuth hook
jest.mock('../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../contexts/AuthContext'),
  useAuth: () => mockAuth,
}));

// Mock the child components
jest.mock('../../components/admin/UserManagement', () => () => (
  <div data-testid="user-management">User Management Component</div>
));

jest.mock('../../components/admin/AnalyticsDashboard', () => () => (
  <div data-testid="analytics-dashboard">Analytics Dashboard Component</div>
));

jest.mock('../../components/admin/SystemSettings', () => () => (
  <div data-testid="system-settings">System Settings Component</div>
));

describe('AdminDashboard', () => {
  const renderComponent = () => {
    return render(
      <Router>
        <SnackbarProvider maxSnack={3}>
          <AuthProvider>
            <AdminDashboard />
          </AuthProvider>
        </SnackbarProvider>
      </Router>
    );
  };

  beforeEach(() => {
    // Mock window.navigator.onLine
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the admin dashboard with navigation', () => {
    renderComponent();
    
    expect(screen.getByText('Trosyn AI Admin')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('shows online status indicator', () => {
    renderComponent();
    
    // The online status indicator should be green when online
    const statusIndicator = screen.getByRole('status');
    expect(statusIndicator).toHaveStyle({ backgroundColor: 'rgb(46, 125, 50)' }); // green[600]
  });

  it('shows offline status when not connected to the internet', () => {
    // Mock offline status
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      configurable: true,
    });
    
    renderComponent();
    
    // The status indicator should be red when offline
    const statusIndicator = screen.getByRole('status');
    expect(statusIndicator).toHaveStyle({ backgroundColor: 'rgb(211, 47, 47)' }); // red[600]
  });

  it('shows notifications badge with unread count', () => {
    renderComponent();
    
    // There should be a badge with the unread count (1 in the mock data)
    const badge = screen.getByText('1');
    expect(badge).toBeInTheDocument();
  });

  it('switches between tabs', () => {
    renderComponent();
    
    // Initially on the Dashboard tab
    expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    
    // Click on the Users tab
    const usersTab = screen.getByText('Users');
    fireEvent.click(usersTab);
    
    // Should show the User Management component
    expect(screen.getByTestId('user-management')).toBeInTheDocument();
    
    // Click on the Analytics tab
    const analyticsTab = screen.getByText('Analytics');
    fireEvent.click(analyticsTab);
    
    // Should show the Analytics Dashboard component
    expect(screen.getByTestId('analytics-dashboard')).toBeInTheDocument();
    
    // Click on the Settings tab
    const settingsTab = screen.getByText('Settings');
    fireEvent.click(settingsTab);
    
    // Should show the System Settings component
    expect(screen.getByTestId('system-settings')).toBeInTheDocument();
  });

  it('shows user profile menu when avatar is clicked', () => {
    renderComponent();
    
    // Click on the avatar to open the menu
    const avatar = screen.getByLabelText('account of current user');
    fireEvent.click(avatar);
    
    // Menu items should be visible
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('logs out when logout is clicked', async () => {
    renderComponent();
    
    // Open the user menu
    const avatar = screen.getByLabelText('account of current user');
    fireEvent.click(avatar);
    
    // Click logout
    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);
    
    // Should call the logout function
    await waitFor(() => {
      expect(mockAuth.logout).toHaveBeenCalled();
    });
  });

  it('marks all notifications as read', async () => {
    renderComponent();
    
    // Find and click the "Mark all as read" button
    const markAllButton = screen.getByText('Mark all as read');
    fireEvent.click(markAllButton);
    
    // Should show a success message
    await waitFor(() => {
      expect(screen.getByText('All notifications marked as read')).toBeInTheDocument();
    });
    
    // The notifications badge should now show 0 unread
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('toggles mobile drawer', () => {
    // Mock mobile view
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: true, // Mobile view
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    
    renderComponent();
    
    // The drawer should be initially closed on mobile
    const menuButton = screen.getByLabelText('open drawer');
    expect(menuButton).toBeInTheDocument();
    
    // Click to open the drawer
    fireEvent.click(menuButton);
    
    // The drawer should now be open
    expect(screen.getByText('Dashboard')).toBeVisible();
    
    // Restore original matchMedia
    window.matchMedia = originalMatchMedia;
  });
});
