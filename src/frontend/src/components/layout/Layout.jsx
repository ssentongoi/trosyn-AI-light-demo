import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Layout.css';

const Layout = () => {
  const { currentUser, logout, isSuperadmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Don't render layout for auth pages
  if (location.pathname === '/login' || location.pathname === '/register') {
    return <Outlet />;
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="logo">Trosyn AI</div>
        <nav className="main-nav">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            Dashboard
          </Link>
          {isSuperadmin && (
            <Link 
              to="/superadmin" 
              className={location.pathname === '/superadmin' ? 'active' : ''}
            >
              Superadmin
            </Link>
          )}
          <Link 
            to="/company-hub" 
            className={location.pathname === '/company-hub' ? 'active' : ''}
          >
            Company Hub
          </Link>
          <Link 
            to="/licensing" 
            className={location.pathname === '/licensing' ? 'active' : ''}
          >
            Licensing & Sync
          </Link>
        </nav>
        <div className="user-menu">
          <span className="username">{currentUser?.username}</span>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>
      
      <main className="app-main">
        <div className="container">
          <Outlet />
        </div>
      </main>
      
      <footer className="app-footer">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} Trosyn AI. All rights reserved.</p>
          <div className="footer-links">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
            <a href="#help">Help Center</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
