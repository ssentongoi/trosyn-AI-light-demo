import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Mock data for development
const mockCompanies = [
  {
    id: 1,
    name: 'Acme Corp',
    status: 'active',
    lastSync: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    licenseExpires: '2024-12-31',
    users: 15,
  },
  {
    id: 2,
    name: 'Globex',
    status: 'inactive',
    lastSync: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    licenseExpires: '2023-12-31',
    users: 8,
  },
  {
    id: 3,
    name: 'Initech',
    status: 'active',
    lastSync: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    licenseExpires: '2024-06-30',
    users: 24,
  },
];

const useCompanies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    syncedCompanies: 0,
  });

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      // In a real app, this would be an API call
      // const response = await axios.get('/api/companies');
      // const companyData = response.data;

      // Using mock data for now
      const companyData = mockCompanies;

      setCompanies(companyData);

      // Calculate stats
      const activeCount = companyData.filter((c) => c.status === 'active').length;
      const syncedCount = companyData.filter((c) => {
        const lastSync = new Date(c.lastSync);
        const hoursSinceSync = (Date.now() - lastSync) / (1000 * 60 * 60);
        return hoursSinceSync < 24; // Synced in last 24 hours
      }).length;

      setStats({
        totalCompanies: companyData.length,
        activeCompanies: activeCount,
        syncedCompanies: syncedCount,
      });
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError('Failed to load company data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const syncCompany = async (companyId) => {
    try {
      // In a real app, this would trigger a sync
      // await axios.post(`/api/companies/${companyId}/sync`);
      alert(`Sync initiated for company ID: ${companyId}`);
      // Refresh data after sync
      fetchCompanies();
    } catch (err) {
      console.error('Error syncing company:', err);
      setError('Failed to initiate sync');
    }
  };

  return { companies, stats, loading, error, syncCompany, refetch: fetchCompanies };
};

export default useCompanies;
