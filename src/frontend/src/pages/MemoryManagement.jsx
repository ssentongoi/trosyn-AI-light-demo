import React from 'react';
import { Container, Tabs, Tab, Box } from '@mui/material';
import MemorySettings from '../components/memory/MemorySettings';
import MemoryVisualization from '../components/memory/MemoryVisualization';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`memory-tabpanel-${index}`}
      aria-labelledby={`memory-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `memory-tab-${index}`,
    'aria-controls': `memory-tabpanel-${index}`,
  };
}

const MemoryManagement = () => {
  const [value, setValue] = React.useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={value} 
          onChange={handleChange} 
          aria-label="memory management tabs"
          variant="fullWidth"
        >
          <Tab label="Visualization" {...a11yProps(0)} />
          <Tab label="Settings" {...a11yProps(1)} />
        </Tabs>
      </Box>
      
      <TabPanel value={value} index={0}>
        <MemoryVisualization />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <MemorySettings />
      </TabPanel>
    </Container>
  );
};

export default MemoryManagement;
