import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Mount the React application
const mountApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('Root element with id="root" not found in index.html');
    return;
  }

  const root = ReactDOM.createRoot(rootElement);
  
  // StrictMode was removed to prevent double-rendering issues with EditorJS.
  root.render(
      <App />
  );
  
  console.log('🎉 Application mounted successfully!');
};

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}

// Log unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
