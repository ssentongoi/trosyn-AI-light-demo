import React from 'react';
import { Link } from 'react-router-dom';

const TestLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="app-layout">
      <header className="app-header" style={{ padding: '1rem', background: '#f5f5f5', marginBottom: '2rem' }}>
        <div className="logo" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>EditorJS Test Page</div>
        <nav style={{ marginTop: '1rem' }}>
          <Link to="/" style={{ marginRight: '1rem', color: '#007bff' }}>Back to App</Link>
        </nav>
      </header>
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1rem' }}>
        {children}
      </main>
    </div>
  );
};

export default TestLayout;
