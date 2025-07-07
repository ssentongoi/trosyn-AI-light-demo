import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, useTheme, CircularProgress } from '@mui/material';
import { tokens } from '../../../../theme';
import DashboardCard from '../DashboardCard';
import { Timeline, TimelineItem, TimelineSeparator, TimelineConnector, TimelineContent, TimelineDot } from '@mui/lab';
import { Article, Description, CloudUpload, Search, Share } from '@mui/icons-material';

const DocumentActivity = ({ activities = [], loading = false, error = null }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // Get icon based on activity type
  const getActivityIcon = (type) => {
    switch (type) {
      case 'upload':
        return <CloudUpload />;
      case 'analysis':
        return <Search />;
      case 'share':
        return <Share />;
      case 'create':
        return <Article />;
      default:
        return <Description />;
    }
  };

  // Format timestamp to relative time
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return interval === 1 ? `${interval} ${unit} ago` : `${interval} ${unit}s ago`;
      }
    }
    
    return 'Just now';
  };
  
  // Process activities for display
  const processedActivities = useMemo(() => {
    return activities.map(activity => ({
      ...activity,
      icon: getActivityIcon(activity.type),
      formattedTime: formatTimeAgo(activity.timestamp)
    }));
  }, [activities]);

  const getActivityText = (activity) => {
    if (!activity) return '';
    
    const user = activity.user?.name || 'Someone';
    const document = activity.document?.name || activity.documentId || 'a document';
    
    switch (activity.type) {
      case 'upload':
        return `uploaded ${document}`;
      case 'analysis':
        return `analyzed ${document}`;
      case 'share':
        return `shared ${document}`;
      case 'create':
        return `created ${document}`;
      case 'update':
        return `updated ${document}`;
      case 'delete':
        return `deleted ${document}`;
      default:
        return `performed an action on ${document}`;
    }
  };

  // Loading state
  if (loading) {
    return (
      <DashboardCard title="Document Activity" loading>
        <Box p={2}>
          {[1, 2, 3].map((i) => (
            <Box key={i} display="flex" gap={2} mb={2}>
              <Box width={40} height={40} borderRadius="50%" bgcolor={colors.primary[400]} display="flex" alignItems="center" justifyContent="center">
                <Box width={24} height={24} bgcolor={colors.primary[500]} borderRadius="50%" />
              </Box>
              <Box flex={1}>
                <Box width="80%" height={16} bgcolor={colors.primary[400]} mb={1} />
                <Box width="60%" height={12} bgcolor={colors.primary[400]} />
              </Box>
            </Box>
          ))}
        </Box>
      </DashboardCard>
    );
  }

  // Error state
  if (error) {
    return (
      <DashboardCard title="Document Activity" error={error}>
        <Box p={2} textAlign="center" color={colors.grey[300]}>
          Failed to load document activity
        </Box>
      </DashboardCard>
    );
  }

  // Empty state
  if (processedActivities.length === 0) {
    return (
      <DashboardCard title="Document Activity">
        <Box p={2} textAlign="center" color={colors.grey[400]}>
          No recent document activity
        </Box>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title="Document Activity">
      <Timeline position="alternate" sx={{ p: 0, m: 0 }}>
        {processedActivities.map((activity, index) => (
          <TimelineItem key={activity.id} sx={{ minHeight: '60px' }}>
            <TimelineSeparator>
              <TimelineDot sx={{ bgcolor: colors.blueAccent[500] }}>
                {activity.icon}
              </TimelineDot>
              {index < processedActivities.length - 1 && (
                <TimelineConnector sx={{ bgcolor: colors.blueAccent[700] }} />
              )}
            </TimelineSeparator>
            <TimelineContent sx={{ py: '12px', px: 2 }}>
              <Box>
                <Typography variant="subtitle2" color={colors.grey[100]}>
                  {activity.user?.name || 'System'}{' '}
                  <Typography component="span" variant="body2" color={colors.grey[400]}>
                    {getActivityText(activity)}
                  </Typography>
                </Typography>
                <Typography variant="caption" color={colors.greenAccent[400]}>
                  {activity.formattedTime || 'Just now'}
                </Typography>
              </Box>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </DashboardCard>
  );
};

DocumentActivity.propTypes = {
  activities: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      type: PropTypes.oneOf(['upload', 'analysis', 'share', 'create', 'update', 'delete']).isRequired,
      user: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        name: PropTypes.string,
        email: PropTypes.string,
      }),
      document: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.shape({
          id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          name: PropTypes.string,
          type: PropTypes.string,
        })
      ]),
      documentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    })
  ),
  loading: PropTypes.bool,
  error: PropTypes.string,
};

DocumentActivity.defaultProps = {
  activities: [],
  loading: false,
  error: null,
};

export default DocumentActivity;
