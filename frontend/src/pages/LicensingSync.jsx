import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { licenseApi, syncApi, tokenApi, analyticsApi } from '../services/licensingSyncService';
import { handleAuthError } from '../services/authService';
import './Dashboard.css';

const LicensingSync = () => {
  const [license, setLicense] = useState(null);
  const [syncSettings, setSyncSettings] = useState({
    syncFrequency: '6', // hours
    lastSync: null,
    nextSync: null,
    syncHistory: [],
    isSyncing: false,
    isOffline: !navigator.onLine,
    offlineSince: !navigator.onLine ? new Date().toISOString() : null,
    offlineQueue: [],
    tokens: []
  });
  
  const [isLoading, setIsLoading] = useState({
    license: true,
    syncStatus: true,
    syncHistory: true,
    tokens: true,
    analytics: true
  });
  
  const [analytics, setAnalytics] = useState({
    syncsLast7Days: 0,
    dataTransferred: '0 B',
    successRate: 0,
    avgSyncDuration: '0s',
    syncsByDay: { labels: [], data: [] },
    dataByType: { documents: 0, images: 0, other: 0 }
  });
  
  // Fetch all data on component mount
  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      // Fetch license data
      setIsLoading(prev => ({ ...prev, license: true }));
      const licenseData = await licenseApi.getLicense();
      setLicense(licenseData);
      
      // Fetch sync status
      setIsLoading(prev => ({ ...prev, syncStatus: true }));
      const syncStatus = await syncApi.getSyncStatus();
      setSyncSettings(prev => ({
        ...prev,
        ...syncStatus,
        isOffline: !navigator.onLine,
        offlineSince: !navigator.onLine ? new Date().toISOString() : null
      }));
      
      // Fetch sync history
      setIsLoading(prev => ({ ...prev, syncHistory: true }));
      const history = await syncApi.getSyncHistory();
      setSyncSettings(prev => ({
        ...prev,
        syncHistory: history
      }));
      
      // Fetch tokens
      setIsLoading(prev => ({ ...prev, tokens: true }));
      const tokens = await tokenApi.getTokens();
      setSyncSettings(prev => ({
        ...prev,
        tokens: tokens || []
      }));
      
      // Fetch analytics
      setIsLoading(prev => ({ ...prev, analytics: true }));
      const analyticsData = await analyticsApi.getSyncAnalytics();
      setAnalytics(analyticsData);
      
    } catch (error) {
      if (!handleAuthError(error)) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again later.');
      }
    } finally {
      setIsLoading({
        license: false,
        syncStatus: false,
        syncHistory: false,
        tokens: false,
        analytics: false
      });
    }
  }, [currentUser]);
  
  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      setSyncSettings(prev => ({
        ...prev,
        isOffline: false,
        offlineSince: null
      }));
      
      // Process offline queue when coming back online
      if (syncSettings.offlineQueue.length > 0) {
        console.log('Processing offline queue...');
        // Process queued sync operations
        for (const item of syncSettings.offlineQueue) {
          if (item.type === 'sync') {
            await handleSyncNow();
          }
        }
        // Clear the queue
        setSyncSettings(prev => ({
          ...prev,
          offlineQueue: []
        }));
      }
      
      // Refresh data when coming back online
      fetchData();
    };
    
    const handleOffline = () => {
      setSyncSettings(prev => ({
        ...prev,
        isOffline: true,
        offlineSince: new Date().toISOString()
      }));
      
      // Add current sync to offline queue if in progress
      if (syncSettings.isSyncing) {
        setSyncSettings(prev => ({
          ...prev,
          isSyncing: false,
          offlineQueue: [...prev.offlineQueue, { type: 'sync', timestamp: new Date().toISOString() }]
        }));
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncSettings.offlineQueue.length, fetchData]);
  
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
    if (syncSettings.isOffline) {
      setError('Cannot sync while offline. Changes will be synced when back online.');
      return;
    }
    
    try {
      setSyncSettings(prev => ({ ...prev, isSyncing: true }));
      
      // Call the sync API
      const result = await syncApi.triggerSync();
      
      // Update local state with the sync result
      setSyncSettings(prev => ({
        ...prev,
        lastSync: result.lastSync,
        nextSync: result.nextSync,
        isSyncing: false,
        syncHistory: [result.latestSync, ...prev.syncHistory]
      }));
      
      // Refresh analytics data
      const analyticsData = await analyticsApi.getSyncAnalytics();
      setAnalytics(analyticsData);
      
      setSuccess('Sync completed successfully!');
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (error) {
      if (handleAuthError(error)) return;
      
      console.error('Error syncing:', error);
      setError(error.message || 'Failed to initiate sync');
      
      const errorSync = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: error.message || 'Unknown error',
        itemsSynced: 0,
        dataTransferred: '0 B',
        duration: '0s'
      };
      
      setSyncSettings(prev => ({
        ...prev,
        isSyncing: false,
        syncHistory: [errorSync, ...prev.syncHistory]
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
    
    if (syncSettings.isOffline) {
      setError('Cannot save settings while offline. Please try again when online.');
      return;
    }
    
    try {
      // Prepare settings to save
      const settingsToSave = {
        syncFrequency: formData.syncFrequency,
        autoSync: formData.autoSync,
        notifyOnFailure: formData.notifyOnFailure
      };
      
      // Save settings to the API
      const result = await syncApi.updateSyncSettings(settingsToSave);
      
      // Update local state with the saved settings
      setSyncSettings(prev => ({
        ...prev,
        ...result.settings,
        nextSync: result.nextSync
      }));
      
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (error) {
      if (handleAuthError(error)) return;
      
      console.error('Error saving settings:', error);
      setError(error.message || 'Failed to save settings');
    }
  };

  const handleUpdateLicense = async (e) => {
    e.preventDefault();
    
    if (syncSettings.isOffline) {
      setError('Cannot update license while offline. Please try again when online.');
      return;
    }
    
    if (!newLicenseKey.trim()) {
      setError('Please enter a valid license key');
      return;
    }
    
    try {
      // Update the license via API
      const updatedLicense = await licenseApi.updateLicense(newLicenseKey);
      
      // Update local state with the new license data
      setLicense(updatedLicense);
      
      setNewLicenseKey('');
      setIsEditing(false);
      setSuccess('License updated successfully!');
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (error) {
      if (handleAuthError(error)) return;
      
      console.error('Error updating license:', error);
      setError(error.message || 'Failed to update license. Please check the key and try again.');
    }
  };

  const formatDate = (dateString, timeOnly = false) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      if (timeOnly) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      }
      
      const now = new Date();
      const diffInMs = now - date;
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      
      // Show relative time for recent dates
      if (diffInMs < 0) {
        // Future date
        return `in ${Math.ceil(-diffInMs / (1000 * 60 * 60 * 24))} days`;
      } else if (diffInHours < 1) {
        const minutes = Math.floor(diffInMs / (1000 * 60));
        if (minutes < 1) return 'just now';
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
      } else if (diffInHours < 48) {
        return 'yesterday';
      } else if (diffInHours < 24 * 7) {
        return `${Math.floor(diffInHours / 24)} days ago`;
      }
      
      // For older dates, show full date
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
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
          <div className="header-actions">
            <button 
              className="btn btn-sm btn-outline-primary"
              onClick={() => {
                setIsEditing(true);
                setNewLicenseKey(license?.key || '');
              }}
              disabled={isLoading.license}
            >
              <i className="fas fa-edit"></i> Edit License
            </button>
          </div>
        </div>
        <div className="card-body">
          {isLoading.license ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading license information...</p>
            </div>
          ) : !license ? (
            <div className="text-center py-4">
              <p>No license information available</p>
              <button 
                className="btn btn-primary mt-2"
                onClick={() => setIsEditing(true)}
              >
                <i className="fas fa-plus"></i> Add License Key
              </button>
            </div>
          ) : isEditing ? (
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

  const handleGenerateToken = async () => {
    if (syncSettings.isOffline) {
      setError('Cannot generate tokens while offline. Please try again when online.');
      return;
    }
    
    try {
      const tokenName = prompt('Enter a name for the new token:');
      if (!tokenName) return;
      
      const newToken = await tokenApi.createToken({
        name: tokenName,
        scopes: ['read']
      });
      
      // Show the token to the user (this is the only time it will be visible)
      const tokenDisplay = `${newToken.id}|${newToken.token}`;
      if (window.confirm(`Your new token has been created. Please copy it now as it won't be shown again:\n\n${tokenDisplay}\n\nCopy to clipboard?`)) {
        navigator.clipboard.writeText(tokenDisplay);
      }
      
      // Update the tokens list
      const tokens = await tokenApi.getTokens();
      setSyncSettings(prev => ({
        ...prev,
        tokens: tokens || []
      }));
      
      setSuccess('Token generated successfully!');
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (error) {
      if (handleAuthError(error)) return;
      
      console.error('Error generating token:', error);
      setError(error.message || 'Failed to generate token');
    }
  };
  
  const handleRevokeToken = async (tokenId) => {
    if (syncSettings.isOffline) {
      setError('Cannot revoke tokens while offline. Please try again when online.');
      return;
    }
    
    if (!window.confirm('Are you sure you want to revoke this token? This action cannot be undone.')) {
      return;
    }
    
    try {
      await tokenApi.revokeToken(tokenId);
      
      // Update the tokens list
      const tokens = await tokenApi.getTokens();
      setSyncSettings(prev => ({
        ...prev,
        tokens: tokens || []
      }));
      
      setSuccess('Token revoked successfully');
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (error) {
      if (handleAuthError(error)) return;
      
      console.error('Error revoking token:', error);
      setError(error.message || 'Failed to revoke token');
    }
  };
  
  const renderSyncTab = () => (
    <div className="tab-content">
      {/* Offline Mode Banner */}
      {syncSettings.isOffline && (
        <div className="alert alert-warning mb-4 d-flex align-items-center" role="alert">
          <i className="fas fa-wifi-slash me-2"></i>
          <div>
            <strong>Offline Mode</strong>
            <div className="small">
              You're currently offline. Changes will be synced when you're back online.
              {syncSettings.offlineSince && (
                <span> Offline since {formatDate(syncSettings.offlineSince, true)}</span>
              )}
            </div>
          </div>
        </div>
      )}
      
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
              {isLoading.syncStatus ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Loading sync status...</p>
                </div>
              ) : (
                <>
                  <h4>Sync Status</h4>
                  <div className="status-grid">
                    <div className="status-item">
                      <span className="status-label">Last Sync:</span>
                      <span className="status-value">
                        {syncSettings.lastSync ? formatDate(syncSettings.lastSync) : 'Never'}
                      </span>
                    </div>
                    <div className="status-item">
                      <span className="status-label">Next Sync:</span>
                      <span className="status-value">
                        {syncSettings.isOffline 
                          ? 'Offline' 
                          : formData.syncFrequency === 'manual' 
                            ? 'Manual only' 
                            : syncSettings.nextSync 
                              ? formatDate(syncSettings.nextSync)
                              : 'N/A'}
                      </span>
                    </div>
                    <div className="status-item">
                      <span className="status-label">Status:</span>
                      <span className="status-value">
                        {syncSettings.isOffline 
                          ? <span className="text-warning">Offline</span> 
                          : syncSettings.isSyncing 
                            ? <span className="text-primary">Syncing...</span>
                            : syncSettings.syncHistory[0]?.status === 'success' 
                              ? <span className="text-success">In sync</span>
                              : <span className="text-danger">Sync required</span>}
                      </span>
                    </div>
                    {syncSettings.offlineQueue.length > 0 && (
                      <div className="status-item">
                        <span className="status-label">Pending Changes:</span>
                        <span className="status-value text-warning">
                          {syncSettings.offlineQueue.length} waiting
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Sync Analytics */}
                  {!isLoading.analytics && (
                    <div className="sync-analytics mt-4">
                      <h5>Sync Analytics</h5>
                      <div className="row g-3">
                        <div className="col-md-4">
                          <div className="card bg-light">
                            <div className="card-body">
                              <h6 className="card-subtitle mb-2 text-muted">Last 7 Days</h6>
                              <div className="d-flex justify-content-between align-items-center">
                                <div>
                                  <div className="h4 mb-0">{analytics.syncsLast7Days}</div>
                                  <small className="text-muted">Syncs</small>
                                </div>
                                <div className="text-success">
                                  <i className="fas fa-arrow-up"></i> 15%
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="card bg-light">
                            <div className="card-body">
                              <h6 className="card-subtitle mb-2 text-muted">Data Transferred</h6>
                              <div className="d-flex justify-content-between align-items-center">
                                <div>
                                  <div className="h4 mb-0">{analytics.dataTransferred}</div>
                                  <small className="text-muted">This month</small>
                                </div>
                                <div className="text-success">
                                  <i className="fas fa-arrow-up"></i> 8%
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="card bg-light">
                            <div className="card-body">
                              <h6 className="card-subtitle mb-2 text-muted">Success Rate</h6>
                              <div className="d-flex justify-content-between align-items-center">
                                <div>
                                  <div className="h4 mb-0">{analytics.successRate}%</div>
                                  <small className="text-muted">Last 30 days</small>
                                </div>
                                <div className="text-success">
                                  <i className="fas fa-check-circle"></i>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="sync-analytics mt-4">
              <h5>Sync Analytics</h5>
              <div className="row g-3">
                <div className="col-md-4">
                  <div className="card bg-light">
                    <div className="card-body">
                      <h6 className="card-subtitle mb-2 text-muted">Last 7 Days</h6>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="h4 mb-0">12</div>
                          <small className="text-muted">Syncs</small>
                        </div>
                        <div className="text-success">
                          <i className="fas fa-arrow-up"></i> 15%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card bg-light">
                    <div className="card-body">
                      <h6 className="card-subtitle mb-2 text-muted">Data Transferred</h6>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="h4 mb-0">24.5 MB</div>
                          <small className="text-muted">This month</small>
                        </div>
                        <div className="text-success">
                          <i className="fas fa-arrow-up"></i> 8%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card bg-light">
                    <div className="card-body">
                      <h6 className="card-subtitle mb-2 text-muted">Success Rate</h6>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="h4 mb-0">98.5%</div>
                          <small className="text-muted">Last 30 days</small>
                        </div>
                        <div className="text-success">
                          <i className="fas fa-check-circle"></i>
                        </div>
                      </div>
                    </div>
                  </div>
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
