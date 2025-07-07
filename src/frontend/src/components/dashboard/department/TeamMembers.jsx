import React from 'react';
import PropTypes from 'prop-types';
import { Avatar, Box, Typography, useTheme, CircularProgress } from '@mui/material';
import { tokens } from '../../../../theme';
import DashboardCard from '../DashboardCard';

const TeamMembers = ({ members = [], loading = false, error = null }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // Generate initials from name
  const getInitials = (name) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Get status from user's last active time or other status indicator
  const getStatus = (user) => {
    if (user.isOnline) return 'online';
    if (user.lastActive) {
      const lastActive = new Date(user.lastActive);
      const minutesAgo = (Date.now() - lastActive) / (1000 * 60);
      if (minutesAgo < 5) return 'online';
      if (minutesAgo < 30) return 'away';
    }
    return 'offline';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return colors.greenAccent[500];
      case 'away':
        return colors.yellowAccent[500];
      default:
        return colors.grey[400];
    }
  };

  // Loading state
  if (loading) {
    return (
      <DashboardCard title="Team Members" loading>
        <Box display="flex" flexDirection="column" gap={2} p={2}>
          {[1, 2, 3].map((i) => (
            <Box key={i} display="flex" alignItems="center" gap={2}>
              <Box width={40} height={40} borderRadius="50%" bgcolor={colors.primary[400]} />
              <Box flex={1}>
                <Box width="60%" height={16} bgcolor={colors.primary[400]} mb={1} />
                <Box width="40%" height={12} bgcolor={colors.primary[400]} />
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
      <DashboardCard title="Team Members" error={error}>
        <Box p={2} textAlign="center" color={colors.grey[300]}>
          Failed to load team members
        </Box>
      </DashboardCard>
    );
  }

  // Empty state
  if (members.length === 0) {
    return (
      <DashboardCard title="Team Members">
        <Box p={2} textAlign="center" color={colors.grey[400]}>
          No team members found
        </Box>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title={`Team Members (${members.length})`}>
      <Box>
        {members.map((member) => {
          const status = getStatus(member);
          const initials = getInitials(member.name || member.email);
          
          return (
            <Box
              key={member.id}
              display="flex"
              alignItems="center"
              p={2}
              borderBottom={`1px solid ${colors.grey[800]}`}
            >
              <Box position="relative" mr={2}>
                <Avatar
                  sx={{
                    bgcolor: colors.blueAccent[500],
                    width: 40,
                    height: 40,
                  }}
                  src={member.avatarUrl}
                >
                  {initials}
                </Avatar>
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 12,
                    height: 12,
                    backgroundColor: getStatusColor(status),
                    borderRadius: '50%',
                    border: `2px solid ${colors.grey[800]}`,
                  }}
                />
              </Box>
              <Box>
                <Typography 
                  variant="h6" 
                  color={colors.grey[100]}
                  sx={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '180px',
                  }}
                >
                  {member.name || member.email.split('@')[0]}
                </Typography>
                <Typography 
                  variant="body2" 
                  color={colors.greenAccent[400]}
                  sx={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '180px',
                  }}
                >
                  {member.role || 'Team Member'}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </DashboardCard>
  );
};

TeamMembers.propTypes = {
  members: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string,
      email: PropTypes.string.isRequired,
      role: PropTypes.string,
      avatarUrl: PropTypes.string,
      isOnline: PropTypes.bool,
      lastActive: PropTypes.string,
    })
  ),
  loading: PropTypes.bool,
  error: PropTypes.string,
};

TeamMembers.defaultProps = {
  members: [],
  loading: false,
  error: null,
};

export default TeamMembers;
