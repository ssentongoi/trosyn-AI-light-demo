import React, { useState, useEffect } from 'react';
import { Badge, BadgeProps, IconButton, Tooltip, styled } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useWebSocket } from '../../contexts/WebSocketContext';

interface NotificationBadgeProps extends Omit<BadgeProps, 'children'> {
  /** Callback when the badge is clicked */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Custom icon to display */
  icon?: React.ReactNode;
  /** Whether to show a tooltip */
  showTooltip?: boolean;
  /** Custom tooltip text */
  tooltipTitle?: string;
  /** Custom class name */
  className?: string;
}

const StyledBadge = styled(Badge)<BadgeProps>(({ theme }) => ({
  '& .MuiBadge-badge': {
    right: 3,
    top: 3,
    border: `2px solid ${theme.palette.background.paper}`,
    padding: '0 4px',
    minWidth: '20px',
    height: '20px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: theme.transitions.create(['background-color', 'transform'], {
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  '&:hover .MuiBadge-badge': {
    transform: 'scale(1.1)',
  },
  '&.pulse .MuiBadge-badge': {
    animation: 'pulse 1.5s infinite',
  },
  '@keyframes pulse': {
    '0%': {
      boxShadow: '0 0 0 0 rgba(244, 67, 54, 0.7)',
    },
    '70%': {
      boxShadow: '0 0 0 10px rgba(244, 67, 54, 0)',
    },
    '100%': {
      boxShadow: '0 0 0 0 rgba(244, 67, 54, 0)',
    },
  },
}));

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  onClick,
  icon = <NotificationsIcon />,
  showTooltip = true,
  tooltipTitle = 'Notifications',
  className = '',
  ...badgeProps
}) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);
  const [previousCount, setPreviousCount] = useState(0);
  const { isConnected, lastMessage } = useWebSocket();

  // Update unread count when new notifications arrive
  useEffect(() => {
    if (lastMessage?.type === 'notification') {
      setUnreadCount(prev => {
        // Only trigger pulse if count increases
        if (prev < (lastMessage.count || prev + 1)) {
          setIsPulsing(true);
          // Stop pulsing after animation completes
          const timer = setTimeout(() => setIsPulsing(false), 1500);
          return () => clearTimeout(timer);
        }
        return lastMessage.count || prev + 1;
      });
    }
  }, [lastMessage]);

  // Handle badge click
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // Reset counter when badge is clicked
    setUnreadCount(0);
    if (onClick) {
      onClick(event);
    }
  };

  // Determine badge color based on unread count
  const getBadgeColor = (): BadgeProps['color'] => {
    if (!isConnected) return 'default';
    if (unreadCount > 5) return 'error';
    if (unreadCount > 0) return 'primary';
    return 'default';
  };

  // Determine if we should show the badge
  const showBadge = isConnected && unreadCount > 0;
  const badgeContent = unreadCount > 99 ? '99+' : unreadCount;
  const badgeColor = getBadgeColor();

  const badge = (
    <StyledBadge
      badgeContent={showBadge ? badgeContent : 0}
      color={badgeColor}
      className={`${className} ${isPulsing ? 'pulse' : ''}`}
      {...badgeProps}
    >
      <IconButton
        size="large"
        aria-label={`${unreadCount} unread notifications`}
        color="inherit"
        onClick={handleClick}
      >
        {icon}
      </IconButton>
    </StyledBadge>
  );

  if (showTooltip) {
    return (
      <Tooltip 
        title={tooltipTitle} 
        arrow
        enterDelay={500}
        enterNextDelay={500}
      >
        {badge}
      </Tooltip>
    );
  }

  return badge;
};

export default React.memo(NotificationBadge);
