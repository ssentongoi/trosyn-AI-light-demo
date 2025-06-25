import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Mock data for development
const mockCompany = {
  id: 1,
  name: 'Acme Corp',
  licenseKey: 'ACME-2023-123456',
  licenseExpires: '2024-12-31',
  status: 'active',
  lastSync: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  nextSync: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
  maxUsers: 50,
  currentUsers: 15,
  maxStorageGB: 100,
  usedStorageGB: 24.5,
};

const mockDepartments = [
  { id: 1, name: 'Engineering', users: 8, documents: 45, lastUpdated: '2023-06-20T14:30:00Z' },
  { id: 2, name: 'Marketing', users: 4, documents: 32, lastUpdated: '2023-06-21T09:15:00Z' },
  { id: 3, name: 'Human Resources', users: 3, documents: 28, lastUpdated: '2023-06-19T16:45:00Z' },
];

const mockStats = {
  totalUsers: 15,
  activeUsers: 12,
  totalDocuments: 105,
  lastSync: mockCompany.lastSync,
};

const useCompanyHub = () => {
  const [company, setCompany] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState(mockStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);

  const fetchCompanyData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      // In a real app, these would be API calls
      // const [companyRes, deptsRes, statsRes] = await Promise.all([
      //   axios.get('/api/company'),
      //   axios.get('/api/departments'),
      //   axios.get('/api/stats'),
      // ]);
      // setCompany(companyRes.data);
      // setDepartments(deptsRes.data);
      // setStats(statsRes.data);

      // Using mock data for now
      setCompany(mockCompany);
      setDepartments(mockDepartments);
      setStats(mockStats);

    } catch (err) {
      console.error('Error fetching company data:', err);
      setError('Failed to load company data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanyData();
  }, [fetchCompanyData]);

  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      // await axios.post('/api/sync/now');
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      const now = new Date().toISOString();
      const updatedCompany = { ...mockCompany, lastSync: now, nextSync: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString() };
      setCompany(updatedCompany);
      setStats(prev => ({ ...prev, lastSync: now }));

      alert('Sync completed successfully!');
    } catch (err) {
      console.error('Error syncing:', err);
      setError('Failed to initiate sync');
    } finally {
      setSyncing(false);
    }
  };

  return { company, departments, stats, loading, error, syncing, handleSyncNow, refetch: fetchCompanyData };
};

export default useCompanyHub;
