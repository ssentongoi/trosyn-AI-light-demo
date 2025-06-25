import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useCompanyHub from '../hooks/useCompanyHub';
import { formatDate, formatTimeUntil } from '../utils/date';
import './Dashboard.css';

const CompanyHub = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { 
    company, 
    departments, 
    stats, 
    loading, 
    error, 
    syncing, 
    handleSyncNow, 
    refetch 
  } = useCompanyHub();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  if (loading || !company) {
    return (
      <div className="dashboard-container">
        <h2>Company Hub</h2>
        <div className="loading">Loading company data...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h2>{company.name} Hub</h2>
          <p className="text-muted">Manage your organization's AI environment</p>
        </div>
        <div className="dashboard-actions">
          <button 
            className={`btn btn-primary ${syncing ? 'btn-loading' : ''}`}
            onClick={handleSyncNow}
            disabled={syncing}
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Users</h3>
          <div className="stat-value">
            {stats.activeUsers} <span className="stat-total">/ {company.maxUsers}</span>
          </div>
          <div className="stat-label">Active</div>
        </div>
        
        <div className="stat-card">
          <h3>Storage</h3>
          <div className="stat-value">
            {company.usedStorageGB.toFixed(1)} <span className="stat-unit">GB</span>
            <span className="stat-total">/ {company.maxStorageGB} GB</span>
          </div>
          <div className="stat-progress">
            <div 
              className="progress-bar" 
              style={{ width: `${(company.usedStorageGB / company.maxStorageGB) * 100}%` }}
            ></div>
          </div>
        </div>
        
        <div className="stat-card">
          <h3>Last Sync</h3>
          <div className="stat-value">
            {formatDate(company.lastSync)}
          </div>
          <div className="stat-label">
            Next sync: {formatTimeUntil(company.nextSync)}
          </div>
        </div>
        
        <div className="stat-card">
          <h3>License</h3>
          <div className="stat-value">
            {company.licenseKey}
          </div>
          <div className="stat-label">
            Expires: {new Date(company.licenseExpires).toLocaleDateString()}
          </div>
        </div>
      </div>
      
      <div className="dashboard-section">
        <div className="section-header">
          <h3>Departments</h3>
          <button 
            className="btn btn-sm btn-outline-primary"
            onClick={() => navigate('/departments/new')}
          >
            <i className="fas fa-plus"></i> Add Department
          </button>
        </div>
        
        <div className="departments-grid">
          {departments.map(dept => (
            <div key={dept.id} className="department-card">
              <div className="department-header">
                <h4>{dept.name}</h4>
                <span className="badge">{dept.documents} docs</span>
              </div>
              <div className="department-stats">
                <div className="stat">
                  <i className="fas fa-users"></i>
                  <span>{dept.users} users</span>
                </div>
                <div className="stat">
                  <i className="fas fa-clock"></i>
                  <span>Updated {formatDate(dept.lastUpdated)}</span>
                </div>
              </div>
              <div className="department-actions">
                <button 
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => navigate(`/departments/${dept.id}`)}
                >
                  View
                </button>
                <button 
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => navigate(`/departments/${dept.id}/settings`)}
                >
                  Settings
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="dashboard-section">
        <div className="section-header">
          <h3>Recent Activity</h3>
          <button className="btn btn-sm btn-link">View All</button>
        </div>
        <div className="activity-feed">
          <div className="activity-item">
            <div className="activity-icon">
              <i className="fas fa-sync"></i>
            </div>
            <div className="activity-content">
              <p>System sync completed successfully</p>
              <small className="text-muted">30 minutes ago</small>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-icon">
              <i className="fas fa-user-plus"></i>
            </div>
            <div className="activity-content">
              <p>New user <strong>Jane Smith</strong> was added to Marketing</p>
              <small className="text-muted">2 hours ago</small>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-icon">
              <i className="fas fa-file-upload"></i>
            </div>
            <div className="activity-content">
              <p>5 new documents were uploaded to Engineering</p>
              <small className="text-muted">5 hours ago</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyHub;
