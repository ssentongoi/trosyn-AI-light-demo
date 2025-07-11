import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, CardHeader, Typography, Box } from '@mui/material';

const DashboardCard = ({ 
  title, 
  children, 
  action, 
  variant = 'elevation', 
  elevation = 1,
  sx = {}
}) => {
  return (
    <Card 
      variant={variant}
      elevation={elevation}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...sx
      }}
    >
      {title && (
        <CardHeader 
          title={
            <Typography variant="h6" component="div">
              {title}
            </Typography>
          }
          action={action}
          sx={{ 
            pb: 1, 
            '& .MuiCardHeader-action': { 
              alignSelf: 'center',
              mt: 0 
            } 
          }}
        />
      )}
      <CardContent sx={{ flexGrow: 1, p: 2, '&:last-child': { pb: 2 } }}>
        {children}
      </CardContent>
    </Card>
  );
};

DashboardCard.propTypes = {
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
  action: PropTypes.node,
  variant: PropTypes.oneOf(['elevation', 'outlined']),
  elevation: PropTypes.number,
  sx: PropTypes.object
};

export default DashboardCard;
