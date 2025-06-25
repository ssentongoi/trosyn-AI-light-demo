import React from 'react';
import PropTypes from 'prop-types';
import { formatTimeAgo } from '../utils/date';

const ActivityFeed = ({ activities, getActivityIcon }) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="empty-state">
        <i className="fas fa-inbox"></i>
        <p>No recent activity to show</p>
      </div>
    );
  }

  return (
    <div className="activity-feed">
      {activities.map((activity) => (
        <div key={activity.id} className="activity-item">
          <div className="activity-icon">
            <i className={`fas fa-${getActivityIcon(activity.type)}`}></i>
          </div>
          <div className="activity-content">
            <div className="activity-main">
              <span className="activity-user">{activity.user}</span>
              <span className="activity-action">{activity.action}</span>
              <span className="activity-title">{activity.title}</span>
              {activity.details && (
                <span className="activity-details">{activity.details}</span>
              )}
            </div>
            <div className="activity-time">
              {formatTimeAgo(activity.timestamp)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

ActivityFeed.propTypes = {
  activities: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      type: PropTypes.string.isRequired,
      action: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      user: PropTypes.string,
      details: PropTypes.string,
      timestamp: PropTypes.string.isRequired,
    })
  ).isRequired,
  getActivityIcon: PropTypes.func.isRequired,
};

export default ActivityFeed;
