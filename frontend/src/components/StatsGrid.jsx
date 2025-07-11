import React from 'react';
import PropTypes from 'prop-types';
import StatCard from './StatCard';

const StatsGrid = ({ stats }) => {
  return (
    <div className="stats-grid">
      {stats.map(stat => (
        <StatCard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
        />
      ))}
    </div>
  );
};

StatsGrid.propTypes = {
  stats: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      icon: PropTypes.element,
    })
  ).isRequired,
};

export default StatsGrid;
