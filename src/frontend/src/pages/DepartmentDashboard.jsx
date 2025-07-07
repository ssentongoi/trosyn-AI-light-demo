import React from 'react';
import { Box } from '@mui/material';
import Layout from '../components/layout/Layout';
import DepartmentDashboard from '../components/dashboard/department/DepartmentDashboard';

const DepartmentDashboardPage = () => {
  return (
    <Layout>
      <Box m="20px">
        <DepartmentDashboard />
      </Box>
    </Layout>
  );
};

export default DepartmentDashboardPage;
