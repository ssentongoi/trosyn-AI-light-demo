import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useCompanies from '../hooks/useCompanies';
import StatCard from '../components/StatCard';
import CompaniesTable from '../components/CompaniesTable';
import './Dashboard.css';

const SuperadminDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { companies, stats, loading, error, syncCompany, refetch } = useCompanies();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <h2>Superadmin Dashboard</h2>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Companies', value: stats.totalCompanies, icon: <i className="fas fa-building"></i> },
    { title: 'Active', value: stats.activeCompanies, icon: <i className="fas fa-toggle-on"></i> },
    { title: 'Recently Synced', value: stats.syncedCompanies, icon: <i className="fas fa-sync-alt"></i> },
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Superadmin Dashboard</h2>
        <div className="dashboard-actions">
          <button className="btn btn-primary" onClick={() => navigate('/add-company')}>
            <i className="fas fa-plus"></i> Add Company
          </button>
          <button className="btn btn-secondary" onClick={refetch}>
            <i className="fas fa-redo"></i> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
          <button className="btn btn-sm btn-outline-danger ms-2" onClick={refetch}>Retry</button>
        </div>
      )}

      <div className="stats-grid">
        {statCards.map((stat) => (
          <StatCard key={stat.title} title={stat.title} value={stat.value} icon={stat.icon} />
        ))}
      </div>

      <CompaniesTable companies={companies} onSync={syncCompany} />
    </div>
  );
};

export default SuperadminDashboard;
