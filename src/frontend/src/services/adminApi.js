import api from './api';

// Dashboard Statistics
export const fetchDashboardStats = async () => {
  try {
    const response = await api.get('/admin/dashboard/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
};

// Notifications
export const fetchNotifications = async () => {
  try {
    const response = await api.get('/admin/notifications');
    return response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

// Recent Activities
export const fetchRecentActivities = async () => {
  try {
    const response = await api.get('/admin/activities/recent');
    return response.data;
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return [];
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId) => {
  try {
    await api.patch(`/admin/notifications/${notificationId}/read`);
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async () => {
  try {
    await api.patch('/admin/notifications/mark-all-read');
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
};

export default {
  fetchDashboardStats,
  fetchNotifications,
  fetchRecentActivities,
  markNotificationAsRead,
  markAllNotificationsAsRead
};
