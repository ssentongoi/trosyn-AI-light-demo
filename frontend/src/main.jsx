// Global error handler for the application
const handleGlobalError = (event) => {
  // Prevent default error handling
  event.preventDefault();
  
  const error = event.error || event.reason || event;
  const errorMessage = error.message || 'Unknown error occurred';
  const errorStack = error.stack || 'No stack trace available';
  
  console.error('Global error caught:', errorMessage, error);
  
  // Update UI to show error
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="padding: 20px; color: red; font-family: Arial, sans-serif;">
        <h2>Application Error</h2>
        <p><strong>${errorMessage}</strong></p>
        <pre>${errorStack}</pre>
      </div>
    `;
  }
  
  // Show native error dialog
  const showTauriDialog = async () => {
    try {
      const { message } = await import('@tauri-apps/api/dialog');
      await message(`Application Error: ${errorMessage}`, { 
        title: 'Error',
        type: 'error' 
      });
    } catch (err) {
      console.warn('Could not show error dialog:', err);
    }
  };
  
  showTauriDialog();
  return false;
};

// Set up global error handlers
window.addEventListener('error', handleGlobalError);
window.addEventListener('unhandledrejection', handleGlobalError);

console.log('🚀 Application starting...');

// Import React and other dependencies
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('✅ Dependencies loaded');

// Initialize Tauri window
const initializeTauri = async () => {
  try {
    const { appWindow } = await import('@tauri-apps/api/window');
    
    // Show and focus the window
    await Promise.all([
      appWindow.show().catch(console.warn),
      appWindow.setFocus().catch(console.warn)
    ]);
    
    console.log('Tauri window initialized');
  } catch (error) {
    console.error('Failed to initialize Tauri window:', error);
    throw error; // Re-throw to be caught by the global handler
  }
};

// Initialize Tauri in non-blocking way
initializeTauri().catch(console.error);

// Development mode setup
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Development mode active');
  // Development-specific code can go here
}

// Mount the React application
const mountApp = () => {
  console.log('🔍 Preparing to mount React app...');
  
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    const error = new Error('Root element with id="root" not found in index.html');
    handleGlobalError({ error });
    return;
  }
  
  try {
    const root = ReactDOM.createRoot(rootElement);
    
    console.log('🚀 Rendering application...');
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    console.log('🎉 Application mounted successfully!');
  } catch (error) {
    console.error('Failed to mount application:', error);
    handleGlobalError({ error });
  }
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
  event.preventDefault();
});
