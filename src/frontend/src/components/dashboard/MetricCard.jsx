import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, SvgIcon, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledMetricCard = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[1],
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    boxShadow: theme.shadows[4],
    transform: 'translateY(-2px)',
  },
}));

const MetricCard = ({
  title,
  value,
  icon: Icon,
  color = 'primary',
  trend,
  tooltip,
  subtext,
  sx = {},
}) => {
  const getTrendColor = () => {
    if (trend?.value > 0) return 'success.main';
    if (trend?.value < 0) return 'error.main';
    return 'text.secondary';
  };

  const getTrendIcon = () => {
    if (trend?.value > 0) return (
      <SvgIcon fontSize="small" color="success">
        <path d="M7 14l5-5 5 5z" />
      </SvgIcon>
    );
    if (trend?.value < 0) return (
      <SvgIcon fontSize="small" color="error">
        <path d="M7 10l5 5 5-5z" />
      </SvgIcon>
    );
    return null;
  };

  const content = (
    <StyledMetricCard sx={sx}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
        <Typography
          variant="subtitle2"
          color="textSecondary"
          sx={{
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: 600,
          }}
        >
          {title}
        </Typography>
        {Icon && (
          <Box
            sx={{
              p: 1,
              borderRadius: '50%',
              bgcolor: `${color}.50`,
              color: `${color}.main`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon fontSize="small" />
          </Box>
        )}
      </Box>
      <Box mt={1}>
        <Typography variant="h4" component="div" fontWeight={700}>
          {value}
        </Typography>
        {(trend || subtext) && (
          <Box display="flex" alignItems="center" mt={1} color={trend ? getTrendColor() : 'text.secondary'}>
            {trend && (
              <>
                {getTrendIcon()}
                <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 600 }}>
                  {Math.abs(trend.value)}% {trend.label}
                </Typography>
              </>
            )}
            {subtext && (
              <Typography variant="caption" sx={{ ml: trend ? 1 : 0 }}>
                {subtext}
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </StyledMetricCard>
  );

  return tooltip ? (
    <Tooltip title={tooltip} arrow>
      {content}
    </Tooltip>
  ) : (
    content
  );
};

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.elementType,
  color: PropTypes.oneOf(['primary', 'secondary', 'error', 'warning', 'info', 'success']),
  trend: PropTypes.shape({
    value: PropTypes.number.isRequired,
    label: PropTypes.string,
  }),
  tooltip: PropTypes.string,
  subtext: PropTypes.node,
  sx: PropTypes.object,
};

export default MetricCard;
