import React, { useState } from 'react';
import { Box, Container, Tabs, Tab, Typography } from '@mui/material';
import UserManagement from '../components/admin/UserManagement';
import AnalyticsDashboard from '../components/admin/AnalyticsDashboard';
import SystemSettings from '../components/admin/SystemSettings';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography component="div">{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `admin-tab-${index}`,
    'aria-controls': `admin-tabpanel-${index}`,
  };
}

const AdminDashboard = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="admin dashboard tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="User Management" {...a11yProps(0)} />
          <Tab label="Analytics" {...a11yProps(1)} />
          <Tab label="System Settings" {...a11yProps(2)} />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <UserManagement />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <AnalyticsDashboard />
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        <SystemSettings />
      </TabPanel>
    </Container>
  );
};

export default AdminDashboard;
