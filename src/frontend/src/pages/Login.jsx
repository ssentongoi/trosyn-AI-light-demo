import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[Login.jsx] handleSubmit triggered');
    setError('');
    setLoading(true);

    try {
      console.log('[Login.jsx] Calling login with:', formData.username);
      const result = await login(formData.username, formData.password);
      console.log('[Login.jsx] Login result:', result);

      if (result.success) {
        console.log('[Login.jsx] Login successful, navigating to dashboard');
        navigate('/dashboard');
      } else {
        console.log('[Login.jsx] Login failed, setting error:', result.error);
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      console.log('[Login.jsx] An unexpected error occurred:', err);
      setError('An unexpected error occurred');
      console.error('Login error:', err);
    } finally {
      console.log('[Login.jsx] handleSubmit finished');
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 data-testid="login-header">Sign in to your account</h1>
          <p>Sign in to your Trosyn AI account</p>
        </div>
        
        {error && <div className="alert alert-danger" data-testid="error-alert">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Enter your username"
            />
          </div>
          
          <div className="form-group">
            <div className="d-flex justify-content-between">
              <label htmlFor="password">Password</label>
              <Link to="/forgot-password" className="forgot-password">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
