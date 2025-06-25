import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './Dashboard.css';

const LicensingSync = () => {
  const [license, setLicense] = useState({
    key: 'ACME-2023-123456',
    type: 'Enterprise',
    status: 'active',
    issuedDate: '2023-01-15',
    expiryDate: '2024-12-31',
    maxUsers: 50,
    maxStorageGB: 100,
    features: [
      'Unlimited Documents',
      'Advanced Analytics',
      'Priority Support',
      'Custom Branding'
    ]
  });
  
  const [syncSettings, setSyncSettings] = useState({
    syncFrequency: '6', // hours
    lastSync: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    nextSync: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
    syncHistory: [
      { id: 1, timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), status: 'success', itemsSynced: 42 },
      { id: 2, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), status: 'success', itemsSynced: 38 },
      { id: 3, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), status: 'success', itemsSynced: 25 },
    ],
    isSyncing: false
  });
  
  const [activeTab, setActiveTab] = useState('license');
  const [formData, setFormData] = useState({
    syncFrequency: '6',
    autoSync: true,
    notifyOnFailure: true
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [newLicenseKey, setNewLicenseKey] = useState('');
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    // In a real app, fetch license and sync settings
    const fetchData = async () => {
      try {
        // const [licenseRes, settingsRes] = await Promise.all([
        //   axios.get('/api/license'),
        //   axios.get('/api/sync/settings')
        // ]);
        // setLicense(licenseRes.data);
        // setSyncSettings(settingsRes.data);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load license and sync settings');
      }
    };

    fetchData();
  }, [currentUser, navigate]);

  const handleSyncNow = async () => {
    try {
      setSyncSettings(prev => ({ ...prev, isSyncing: true }));
      
      // In a real app, this would trigger a sync
      // await axios.post('/api/sync/now');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update sync status
      const now = new Date().toISOString();
      const nextSync = new Date(Date.now() + parseInt(formData.syncFrequency) * 60 * 60 * 1000).toISOString();
      
      setSyncSettings(prev => ({
        ...prev,
        lastSync: now,
        nextSync,
        isSyncing: false,
        syncHistory: [
          {
            id: prev.syncHistory.length + 1,
            timestamp: now,
            status: 'success',
            itemsSynced: Math.floor(Math.random() * 50) + 10
          },
          ...prev.syncHistory
        ]
      }));
      
      setSuccess('Sync completed successfully!');
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (err) {
      console.error('Error syncing:', err);
      setError('Failed to initiate sync');
      setSyncSettings(prev => ({
        ...prev,
        isSyncing: false,
        syncHistory: [
          {
            id: prev.syncHistory.length + 1,
            timestamp: new Date().toISOString(),
            status: 'failed',
            error: err.message || 'Unknown error'
          },
          ...prev.syncHistory
        ]
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    
    try {
      // In a real app, save settings to the API
      // await axios.put('/api/sync/settings', formData);
      
      // Update local state
      setSyncSettings(prev => ({
        ...prev,
        syncFrequency: formData.syncFrequency,
        // Recalculate next sync time based on new frequency
        nextSync: new Date(
          Date.now() + parseInt(formData.syncFrequency) * 60 * 60 * 1000
        ).toISOString()
      }));
      
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    }
  };

  const handleUpdateLicense = async (e) => {
    e.preventDefault();
    
    if (!newLicenseKey.trim()) {
      setError('Please enter a valid license key');
      return;
    }
    
    try {
      // In a real app, validate and update the license key
      // await axios.put('/api/license', { key: newLicenseKey });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update local state with mock data
      setLicense(prev => ({
        ...prev,
        key: newLicenseKey,
        expiryDate: '2025-12-31', // Extend license by 1 year
        status: 'active'
      }));
      
      setNewLicenseKey('');
      setIsEditing(false);
      setSuccess('License updated successfully!');
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (err) {
      console.error('Error updating license:', err);
      setError('Failed to update license. Please check the key and try again.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      active: { text: 'Active', class: 'status-active' },
      expired: { text: 'Expired', class: 'status-expired' },
      suspended: { text: 'Suspended', class: 'status-suspended' },
      trial: { text: 'Trial', class: 'status-trial' }
    };
    
    const statusInfo = statusMap[status.toLowerCase()] || { text: status, class: 'status-unknown' };
    return <span className={`status-badge ${statusInfo.class}`}>{statusInfo.text}</span>;
  };

  const renderLicenseTab = () => (
    <div className="tab-content">
      <div className="card">
        <div className="card-header">
          <h3>License Information</h3>
          {!isEditing ? (
            <button 
              className="btn btn-sm btn-outline-primary"
              onClick={() => setIsEditing(true)}
            >
              Update License
            </button>
          ) : null}
        </div>
        
        <div className="card-body">
          {isEditing ? (
            <form onSubmit={handleUpdateLicense}>
              <div className="form-group">
                <label>License Key</label>
                <input
                  type="text"
                  className="form-control"
                  value={newLicenseKey}
                  onChange={(e) => setNewLicenseKey(e.target.value)}
                  placeholder="Enter new license key"
                  required
                />
              </div>
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setNewLicenseKey('');
                    setError('');
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="license-details">
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span className="detail-value">
                  {getStatusBadge(license.status)}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">License Key:</span>
                <span className="detail-value">{license.key}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Type:</span>
                <span className="detail-value">{license.type}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Issued On:</span>
                <span className="detail-value">
                  {new Date(license.issuedDate).toLocaleDateString()}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Expires On:</span>
                <span className={`detail-value ${new Date(license.expiryDate) < new Date() ? 'text-danger' : ''}`}>
                  {new Date(license.expiryDate).toLocaleDateString()}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Max Users:</span>
                <span className="detail-value">{license.maxUsers}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Max Storage:</span>
                <span className="detail-value">{license.maxStorageGB} GB</span>
              </div>
              
              <div className="features-section">
                <h4>Included Features:</h4>
                <ul className="features-list">
                  {license.features.map((feature, index) => (
                    <li key={index}>
                      <i className="fas fa-check-circle text-success"></i> {feature}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="license-actions">
                <button className="btn btn-outline-primary">
                  <i className="fas fa-download"></i> Download License
                </button>
                <button className="btn btn-outline-secondary">
                  <i className="fas fa-print"></i> Print License
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h3>Renew or Upgrade</h3>
        </div>
        <div className="card-body">
          <p>To renew your license or upgrade your plan, please contact our sales team.</p>
          <a href="mailto:sales@trosyn.ai" className="btn btn-primary">
            <i className="fas fa-envelope"></i> Contact Sales
          </a>
        </div>
      </div>
    </div>
  );

  const renderSyncTab = () => (
    <div className="tab-content">
      <div className="card">
        <div className="card-header">
          <h3>Sync Settings</h3>
          <button 
            className={`btn btn-primary ${syncSettings.isSyncing ? 'btn-loading' : ''}`}
            onClick={handleSyncNow}
            disabled={syncSettings.isSyncing}
          >
            {syncSettings.isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
        
        <div className="card-body">
          <form onSubmit={handleSaveSettings}>
            <div className="form-group">
              <label>Sync Frequency</label>
              <select 
                name="syncFrequency"
                className="form-control"
                value={formData.syncFrequency}
                onChange={handleInputChange}
                disabled={syncSettings.isSyncing}
              >
                <option value="1">Every hour</option>
                <option value="6">Every 6 hours</option>
                <option value="12">Every 12 hours</option>
                <option value="24">Every 24 hours</option>
                <option value="manual">Manual only</option>
              </select>
              <small className="form-text text-muted">
                How often the system should automatically sync with the cloud
              </small>
            </div>
            
            <div className="form-check">
              <input
                type="checkbox"
                id="autoSync"
                name="autoSync"
                className="form-check-input"
                checked={formData.autoSync}
                onChange={handleInputChange}
                disabled={formData.syncFrequency === 'manual' || syncSettings.isSyncing}
              />
              <label className="form-check-label" htmlFor="autoSync">
                Enable automatic sync
              </label>
            </div>
            
            <div className="form-check">
              <input
                type="checkbox"
                id="notifyOnFailure"
                name="notifyOnFailure"
                className="form-check-input"
                checked={formData.notifyOnFailure}
                onChange={handleInputChange}
                disabled={syncSettings.isSyncing}
              />
              <label className="form-check-label" htmlFor="notifyOnFailure">
                Notify me on sync failure
              </label>
            </div>
            
            <div className="sync-status mt-4">
              <h4>Sync Status</h4>
              <div className="status-grid">
                <div className="status-item">
                  <span className="status-label">Last Sync:</span>
                  <span className="status-value">
                    {formatDate(syncSettings.lastSync)}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Next Sync:</span>
                  <span className="status-value">
                    {formData.syncFrequency === 'manual' 
                      ? 'Manual only' 
                      : formatDate(syncSettings.nextSync)}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Status:</span>
                  <span className="status-value">
                    {syncSettings.isSyncing 
                      ? 'Syncing...' 
                      : syncSettings.syncHistory[0]?.status === 'success' 
                        ? 'In sync' 
                        : 'Sync required'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={syncSettings.isSyncing}
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h3>Sync History</h3>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="sync-history-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th>Details</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {syncSettings.syncHistory.map((sync) => (
                  <tr key={sync.id} className={sync.status}>
                    <td>{formatDate(sync.timestamp)}</td>
                    <td>
                      <span className={`badge ${sync.status === 'success' ? 'bg-success' : 'bg-danger'}`}>
                        {sync.status.charAt(0).toUpperCase() + sync.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      {sync.status === 'success' 
                        ? `${sync.itemsSynced} items synced` 
                        : sync.error || 'Sync failed'}
                    </td>
                    <td>
                      <button 
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => console.log('View sync details:', sync.id)}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {syncSettings.syncHistory.length === 0 && (
            <div className="text-center py-4">
              <p>No sync history available</p>
            </div>
          )}
          
          <div className="text-end mt-3">
            <button className="btn btn-sm btn-link">
              View Full History
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Licensing & Sync</h2>
        <p className="text-muted">Manage your license and synchronization settings</p>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <div className="tabs-container">
        <div className="tabs-header">
          <button 
            className={`tab-btn ${activeTab === 'license' ? 'active' : ''}`}
            onClick={() => setActiveTab('license')}
          >
            <i className="fas fa-key"></i> License
          </button>
          <button 
            className={`tab-btn ${activeTab === 'sync' ? 'active' : ''}`}
            onClick={() => setActiveTab('sync')}
          >
            <i className="fas fa-sync"></i> Sync Settings
          </button>
        </div>
        
        <div className="tabs-content">
          {activeTab === 'license' ? renderLicenseTab() : renderSyncTab()}
        </div>
      </div>
    </div>
  );
};

export default LicensingSync;
