import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Typography, 
  Container, 
  Paper,
  Alert,
  AlertTitle,
  Divider,
  Box
} from '@mui/material';

const Register: React.FC = () => {
  const navigate = useNavigate();

  // Auto-navigate to home since auth is disabled
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/');
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <Container component="main" maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
        <Typography component="h1" variant="h4" align="center" gutterBottom>
          Trosyn AI
        </Typography>
        
        <Alert 
          severity="info" 
          sx={{ mb: 4 }}
        >
          <AlertTitle>Registration Temporarily Disabled</AlertTitle>
          For development and testing purposes, user registration has been temporarily disabled.
          You will be automatically redirected to the application.
        </Alert>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="body1" align="center" sx={{ mt: 3 }}>
          <Link to="/">Click here</Link> if you're not automatically redirected.
        </Typography>
      </Paper>
    </Container>
  );
};

export default Register;
