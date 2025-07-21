import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useCompanies from '../hooks/useCompanies';
import StatCard from '../components/StatCard';
import CompaniesTable from '../components/CompaniesTable';
import './Dashboard.css';

interface Company {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'pending';
  // Add other company properties as needed
}

interface DashboardStats {
  totalCompanies: number;
  activeCompanies: number;
  inactiveCompanies: number;
  // Add other stats properties as needed
}

const SuperadminDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { companies, stats, loading, error, syncCompany, refetch } = useCompanies();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="dashboard-error">Error loading dashboard: {error.message}</div>;
  }

  return (
    <div className="superadmin-dashboard">
      <h1>Superadmin Dashboard</h1>
      
      <div className="dashboard-stats">
        <StatCard 
          title="Total Companies" 
          value={stats?.totalCompanies.toString() || '0'} 
          icon="🏢"
        />
        <StatCard 
          title="Active Companies" 
          value={stats?.activeCompanies.toString() || '0'} 
          icon="✅"
        />
        <StatCard 
          title="Inactive Companies" 
          value={stats?.inactiveCompanies.toString() || '0'} 
          icon="⏸️"
        />
      </div>
      
      <div className="companies-section">
        <h2>Company Management</h2>
        <CompaniesTable 
          companies={companies} 
          onSyncCompany={syncCompany}
          onRefresh={refetch}
        />
      </div>
    </div>
  );
};

export default SuperadminDashboard;
