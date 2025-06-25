import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';

const QuickActions = ({ isSuperadmin }) => {
  const navigate = useNavigate();

  const actionButtons = [
    { icon: 'upload', text: 'Upload Document', path: '/documents/upload' },
    { icon: 'plus-circle', text: 'Create Task', path: '/tasks/new' },
    { icon: 'search', text: 'Search Documents', path: '/documents' },
    { icon: 'chart-bar', text: 'View Reports', path: '/reports' },
  ];

  const adminButtons = [
    { icon: 'users-cog', text: 'Manage Users', path: '/admin/users' },
    { icon: 'cog', text: 'Admin Settings', path: '/admin/settings' },
  ];

  const quickLinks = [
    { icon: 'question-circle', text: 'Help Center', href: '/help' },
    { icon: 'code', text: 'API Documentation', href: '/api-docs' },
    { icon: 'comment-alt', text: 'Send Feedback', href: '/feedback' },
  ];

  return (
    <div className="quick-actions">
      <div className="section-header">
        <h2>Quick Actions</h2>
      </div>

      <div className="action-buttons">
        {actionButtons.map((btn) => (
          <button key={btn.path} className="action-button" onClick={() => navigate(btn.path)}>
            <i className={`fas fa-${btn.icon}`}></i>
            <span>{btn.text}</span>
          </button>
        ))}
        {isSuperadmin && adminButtons.map((btn) => (
          <button key={btn.path} className="action-button" onClick={() => navigate(btn.path)}>
            <i className={`fas fa-${btn.icon}`}></i>
            <span>{btn.text}</span>
          </button>
        ))}
      </div>

      <div className="quick-links">
        <h3>Quick Links</h3>
        <ul>
          {quickLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} target="_blank" rel="noopener noreferrer">
                <i className={`fas fa-${link.icon}`}></i> {link.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

QuickActions.propTypes = {
  isSuperadmin: PropTypes.bool,
};

QuickActions.defaultProps = {
  isSuperadmin: false,
};

export default QuickActions;
