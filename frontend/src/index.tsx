import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './App.css';

console.log('1. Starting app initialization...');

const container = document.getElementById('root');
if (!container) {
  console.error('❌ Root container not found! Make sure you have a <div id="root"></div> in your index.html');
} else {
  console.log('2. Root container found, creating root...');
  const root = createRoot(container);
  console.log('3. Rendering App component...');
  
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
  
  console.log('4. App component rendered');
}

console.log('5. Initialization complete');
