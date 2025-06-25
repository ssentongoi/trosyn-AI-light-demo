import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { formatDate, formatTimeAgo } from '../utils/date';

const getStatusBadge = (status) => {
  const statusMap = {
    active: { text: 'Active', class: 'status-active' },
    inactive: { text: 'Inactive', class: 'status-inactive' },
    suspended: { text: 'Suspended', class: 'status-suspended' },
  };
  const statusInfo = statusMap[status] || { text: status, class: 'status-unknown' };
  return <span className={`status-badge ${statusInfo.class}`}>{statusInfo.text}</span>;
};

const CompaniesTable = ({ companies, onSync }) => {
  const navigate = useNavigate();

  if (!companies || companies.length === 0) {
    return <p>No companies found.</p>;
  }

  return (
    <div className="table-responsive">
      <table className="companies-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Status</th>
            <th>Last Sync</th>
            <th>License Expires</th>
            <th>Users</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => (
            <tr key={company.id}>
              <td>
                <div className="company-info">
                  <div className="company-name">{company.name}</div>
                  <div className="company-id">ID: {company.id}</div>
                </div>
              </td>
              <td>{getStatusBadge(company.status)}</td>
              <td title={formatDate(company.lastSync)}>{formatTimeAgo(company.lastSync)}</td>
              <td>
                {new Date(company.licenseExpires).toLocaleDateString()}
                {new Date(company.licenseExpires) < new Date() && (
                  <span className="expired-badge">Expired</span>
                )}
              </td>
              <td>{company.users}</td>
              <td>
                <div className="table-actions">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => onSync(company.id)}
                    title="Sync Now"
                  >
                    <i className="fas fa-sync-alt"></i>
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => navigate(`/company/${company.id}`)}
                    title="View Details"
                  >
                    <i className="fas fa-eye"></i>
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => navigate(`/company/${company.id}/edit`)}
                    title="Edit"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

CompaniesTable.propTypes = {
  companies: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired,
      lastSync: PropTypes.string,
      licenseExpires: PropTypes.string.isRequired,
      users: PropTypes.number.isRequired,
    })
  ).isRequired,
  onSync: PropTypes.func.isRequired,
};

export default CompaniesTable;
