import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useDashboard from '../hooks/useDashboard';
import DashboardHeader from '../components/DashboardHeader';
import StatsGrid from '../components/StatsGrid';
import ActivityFeed from '../components/ActivityFeed';
import QuickActions from '../components/QuickActions';
import './Dashboard.css';

const Dashboard = () => {
  const { currentUser, isSuperadmin } = useAuth();
  const navigate = useNavigate();
  const { stats, recentActivity, loading, error, getGreeting, getActivityIcon, refetch } = useDashboard();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  const dashboardStats = [
    { title: 'Total Documents', value: stats.totalDocuments, icon: <i className="fas fa-file-alt"></i> },
    { title: 'Pending Reviews', value: stats.pendingReviews, icon: <i className="fas fa-tasks"></i> },
    { title: 'Completed Tasks', value: stats.completedTasks, icon: <i className="fas fa-check-circle"></i> },
    { title: 'Storage Used', value: `${stats.storageUsed} GB`, icon: <i className="fas fa-hdd"></i> },
  ];

  return (
    <div className="dashboard-container">
      <DashboardHeader greeting={getGreeting()} userName={currentUser.fullName || currentUser.username} />

      {error && (
        <div className="alert alert-danger">
          {error}
          <button className="btn btn-sm btn-outline-danger ms-2" onClick={refetch}>Retry</button>
        </div>
      )}

      <StatsGrid stats={dashboardStats} />

      <div className="dashboard-main-content">
        <div className="main-column">
          <div className="section-header">
            <h2>Recent Activity</h2>
            <button className="btn btn-sm btn-link" onClick={() => navigate('/activity')}>
              View All
            </button>
          </div>
          <ActivityFeed activities={recentActivity} getActivityIcon={getActivityIcon} />
        </div>
        <QuickActions isSuperadmin={isSuperadmin} />
      </div>

      <div className="dashboard-section">
        <div className="section-header">
          <h2>Recent Documents</h2>
          <button className="btn btn-sm btn-link" onClick={() => navigate('/documents')}>
            View All
          </button>
        </div>
        <div className="empty-state">
          <i className="fas fa-folder-open"></i>
          <p>No recent documents to display</p>
          <button className="btn btn-primary" onClick={() => navigate('/documents/upload')}>
            Upload Your First Document
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
