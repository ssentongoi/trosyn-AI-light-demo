import React from 'react';
import PropTypes from 'prop-types';

const DashboardHeader = ({ greeting, userName }) => {
  return (
    <div className="dashboard-header">
      <div>
        <h2>{greeting}, {userName}!</h2>
        <p className="text-muted">Here's what's happening today.</p>
      </div>
    </div>
  );
};

DashboardHeader.propTypes = {
  greeting: PropTypes.string.isRequired,
  userName: PropTypes.string.isRequired,
};

export default DashboardHeader;
