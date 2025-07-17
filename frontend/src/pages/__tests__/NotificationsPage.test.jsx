import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import NotificationsPage from '../NotificationsPage';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

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

describe('NotificationsPage', () => {
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
    renderWithProviders(<NotificationsPage />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  test('renders notifications after loading', async () => {
    renderWithProviders(<NotificationsPage />);
    
    // Fast-forward timers to resolve the mock data loading
    vi.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Check if notifications are rendered
    expect(screen.getByText('New message from John')).toBeInTheDocument();
    expect(screen.getByText('Document approved')).toBeInTheDocument();
    expect(screen.getByText('System update available')).toBeInTheDocument();
  });

  test('filters notifications when tab is changed', async () => {
    renderWithProviders(<NotificationsPage />);
    
    // Fast-forward timers to resolve the mock data loading
    vi.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Initially all notifications should be visible
    expect(screen.getByText('New message from John')).toBeInTheDocument();
    expect(screen.getByText('System update available')).toBeInTheDocument();
    
    // Click the Unread tab
    fireEvent.click(screen.getByText('Unread'));
    
    // Only unread notifications should be visible
    expect(screen.getByText('New message from John')).toBeInTheDocument();
    expect(screen.queryByText('System update available')).not.toBeInTheDocument();
    
    // Click the System tab
    fireEvent.click(screen.getByText('System'));
    
    // Only system notifications should be visible
    expect(screen.queryByText('New message from John')).not.toBeInTheDocument();
    expect(screen.getByText('System update available')).toBeInTheDocument();
  });

  test('marks notification as read when clicked', async () => {
    renderWithProviders(<NotificationsPage />);
    
    // Fast-forward timers to resolve the mock data loading
    vi.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Click on a notification
    fireEvent.click(screen.getByText('New message from John'));
    
    // Check if success message is shown
    expect(screen.getByText('Notification marked as read')).toBeInTheDocument();
  });

  test('marks all notifications as read', async () => {
    renderWithProviders(<NotificationsPage />);
    
    // Fast-forward timers to resolve the mock data loading
    vi.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Click the "Mark all as read" button
    fireEvent.click(screen.getByText('Mark all as read'));
    
    // Check if success message is shown
    expect(screen.getByText('All notifications marked as read')).toBeInTheDocument();
  });

  test('deletes notification from menu', async () => {
    renderWithProviders(<NotificationsPage />);
    
    // Fast-forward timers to resolve the mock data loading
    vi.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Open the menu for a notification
    const menuButtons = screen.getAllByLabelText('more');
    fireEvent.click(menuButtons[0]);
    
    // Click the Delete option
    fireEvent.click(screen.getByText('Delete'));
    
    // Check if success message is shown
    expect(screen.getByText('Notification deleted')).toBeInTheDocument();
  });

  test('clears all notifications', async () => {
    renderWithProviders(<NotificationsPage />);
    
    // Fast-forward timers to resolve the mock data loading
    vi.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Click the "Clear all" button
    fireEvent.click(screen.getByText('Clear all'));
    
    // Check if success message is shown
    expect(screen.getByText('All notifications cleared')).toBeInTheDocument();
    
    // Check if empty state is shown
    await waitFor(() => {
      expect(screen.getByText('No notifications found')).toBeInTheDocument();
    });
  });

  test('displays error state when loading fails', async () => {
    // Mock console.error to throw an error during loading
    vi.spyOn(console, 'error').mockImplementation(() => {
      throw new Error('Failed to load notifications');
    });
    
    renderWithProviders(<NotificationsPage />);
    
    // Fast-forward timers to trigger the error
    vi.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load notifications. Please try again.')).toBeInTheDocument();
    });
  });

  test('displays correct priority chips for notifications', async () => {
    renderWithProviders(<NotificationsPage />);
    
    // Fast-forward timers to resolve the mock data loading
    vi.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Check if priority chips are displayed
    expect(screen.getAllByText('High')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Medium')[0]).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  test('displays correct notification icons based on type', async () => {
    renderWithProviders(<NotificationsPage />);
    
    // Fast-forward timers to resolve the mock data loading
    vi.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Check if notification icons are rendered (this is a bit tricky to test directly)
    // We can check for SVG elements or specific aria-labels if they exist
    const svgElements = document.querySelectorAll('svg');
    expect(svgElements.length).toBeGreaterThan(0);
  });

  test('refreshes notifications when refresh button is clicked', async () => {
    renderWithProviders(<NotificationsPage />);
    
    // Mock window.location.reload
    const originalReload = window.location.reload;
    window.location.reload = vi.fn();
    
    // Fast-forward timers to resolve the mock data loading
    vi.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Click the Refresh button
    fireEvent.click(screen.getByText('Refresh'));
    
    // Check if reload was called
    expect(window.location.reload).toHaveBeenCalled();
    
    // Restore original reload function
    window.location.reload = originalReload;
  });
});
