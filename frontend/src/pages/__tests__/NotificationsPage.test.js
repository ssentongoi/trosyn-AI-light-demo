import { jsx as _jsx } from "@emotion/react/jsx-runtime";
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import NotificationsPage from '../NotificationsPage';
import { notificationService } from '../../services/notificationService';
import { render } from '../../test-utils/test-utilities';
// Helper function to create a test notification with all required fields
const createTestNotification = (overrides = {}) => {
    const now = new Date().toISOString();
    return {
        id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'info',
        read: false,
        timestamp: now,
        ...overrides,
    };
};
// Mock the notification service
vi.mock('../../services/notificationService');
// Mock date-fns formatDistanceToNow to return a fixed value
vi.mock('date-fns', () => ({
    formatDistanceToNow: () => '2 days ago',
    __esModule: true,
}));
describe('NotificationsPage', () => {
    const mockNotifications = [
        {
            id: '1',
            type: 'info',
            title: 'Test Notification',
            message: 'This is a test notification',
            read: false,
            timestamp: new Date().toISOString(),
        },
        {
            id: '2',
            type: 'success',
            title: 'Another Notification',
            message: 'This is another test notification',
            read: true,
            timestamp: new Date().toISOString(),
        },
    ];
    const renderComponent = () => {
        return render(_jsx(NotificationsPage, {}));
    };
    beforeEach(() => {
        // Reset all mocks before each test
        vi.clearAllMocks();
        // Setup default mock implementations
        vi.mocked(notificationService.getNotifications).mockResolvedValue(mockNotifications);
        vi.mocked(notificationService.subscribe).mockImplementation((callback) => {
            // Store the callback to simulate updates
            notificationService.mockCallback = callback;
            return () => { }; // Return cleanup function
        });
        // Mock other required methods with proper typing
        vi.mocked(notificationService.markAsRead).mockResolvedValue(undefined);
        vi.mocked(notificationService.markAllAsRead).mockResolvedValue(undefined);
        vi.mocked(notificationService.close).mockImplementation(() => { });
        vi.mocked(notificationService.closeAll).mockImplementation(() => { });
        // Mock getNotifications to return a resolved promise with mock data
        vi.mocked(notificationService.getNotifications).mockImplementation(() => Promise.resolve(mockNotifications));
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });
    it('renders loading state initially', async () => {
        // Use a promise that never resolves to test loading state
        vi.mocked(notificationService.getNotifications).mockImplementation(() => new Promise(() => { }) // Never resolves
        );
        renderComponent();
        // Check for loading state
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
    it('displays notifications when loaded', async () => {
        renderComponent();
        // Wait for notifications to load
        await waitFor(() => {
            expect(notificationService.getNotifications).toHaveBeenCalledTimes(1);
        });
        // Check if notifications are displayed
        const notifications = screen.getAllByRole('listitem');
        expect(notifications).toHaveLength(2);
        // Check notification content
        const notification1 = within(notifications[0]);
        expect(notification1.getByText('Test Notification')).toBeInTheDocument();
        expect(notification1.getByText('This is a test notification')).toBeInTheDocument();
        // Check tabs
        const tabs = screen.getAllByRole('tab');
        expect(tabs[0]).toHaveTextContent('All (2)');
        expect(tabs[1]).toHaveTextContent('Unread (1)');
    });
    it('filters notifications by tab', async () => {
        renderComponent();
        // Wait for initial load
        await waitFor(() => {
            expect(notificationService.getNotifications).toHaveBeenCalled();
        });
        // Click on Unread tab
        fireEvent.click(screen.getByText(/Unread/));
        // Only unread notifications should be visible
        await waitFor(() => {
            expect(screen.getByText('Test Notification')).toBeInTheDocument();
            expect(screen.queryByText('Another Notification')).not.toBeInTheDocument();
        });
        // Click on All tab
        fireEvent.click(screen.getByText('All (2)'));
        // All notifications should be visible again
        await waitFor(() => {
            expect(screen.getByText('Test Notification')).toBeInTheDocument();
            expect(screen.getByText('Another Notification')).toBeInTheDocument();
        });
    });
    it('marks a notification as read', async () => {
        renderComponent();
        // Wait for notifications to load
        await waitFor(() => {
            expect(notificationService.getNotifications).toHaveBeenCalled();
        });
        // Open the menu for the first notification
        const menuButtons = screen.getAllByLabelText('more');
        fireEvent.click(menuButtons[0]);
        // Click on "Mark as read"
        fireEvent.click(screen.getByText('Mark as read'));
        // Verify markAsRead was called with the correct ID
        await waitFor(() => {
            expect(notificationService.markAsRead).toHaveBeenCalledWith('1');
        });
    });
    it('marks all notifications as read', async () => {
        renderComponent();
        // Wait for notifications to load
        await waitFor(() => {
            expect(notificationService.getNotifications).toHaveBeenCalled();
        });
        // Click on "Mark all as read" button
        fireEvent.click(screen.getByText('Mark all as read'));
        // Verify markAllAsRead was called
        await waitFor(() => {
            expect(notificationService.markAllAsRead).toHaveBeenCalledTimes(1);
        });
    });
    it('deletes a notification', async () => {
        renderComponent();
        // Wait for notifications to load
        await waitFor(() => {
            expect(notificationService.getNotifications).toHaveBeenCalled();
        });
        // Open the menu for the first notification
        const menuButtons = screen.getAllByLabelText('more');
        fireEvent.click(menuButtons[0]);
        // Click on "Delete"
        fireEvent.click(screen.getByText('Delete'));
        // Verify close was called with the correct ID
        await waitFor(() => {
            expect(notificationService.close).toHaveBeenCalledWith('1');
        });
    });
    it('updates when notifications change', async () => {
        renderComponent();
        // Wait for initial load
        await waitFor(() => {
            expect(notificationService.getNotifications).toHaveBeenCalled();
        });
        // Simulate a new notification
        const newNotification = {
            id: '3',
            type: 'warning',
            title: 'New Notification',
            message: 'This is a new notification',
            read: false,
            timestamp: new Date().toISOString(),
        };
        // Trigger the subscription callback
        notificationService.mockCallback([...mockNotifications, newNotification]);
        // The new notification should be displayed
        await waitFor(() => {
            expect(screen.getByText('New Notification')).toBeInTheDocument();
        });
    });
    it('displays empty state when no notifications', async () => {
        // Return empty array for notifications
        vi.mocked(notificationService.getNotifications).mockResolvedValue([]);
        renderComponent();
        // Should show empty state
        await waitFor(() => {
            expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
        });
    });
    it('handles errors when loading notifications', async () => {
        // Simulate an error
        const errorMessage = 'Failed to load notifications';
        vi.mocked(notificationService.getNotifications).mockImplementation(() => {
            throw new Error(errorMessage);
        });
        // Mock console.error to avoid test noise
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
        renderComponent();
        // Should handle the error gracefully
        await waitFor(() => {
            expect(consoleError).toHaveBeenCalledWith('Error loading notifications:', expect.any(Error));
        });
        // Cleanup
        consoleError.mockRestore();
    });
});
