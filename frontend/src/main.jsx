import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Debug logging to troubleshoot mounting issues
console.log('main.jsx is executing');
console.log('Looking for root element to mount React app');

const rootElement = document.getElementById('root');

if (rootElement) {
  console.log('Root element found, mounting React app');
  
  // React 18 createRoot API
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  console.log('React app mounted successfully');
} else {
  console.error('Root element not found! Cannot mount React app');
}
