import React from 'react';
import ReactDOM from 'react-dom/client';
import EditorSandbox from './EditorSandbox';
import './styles/globals.css';

// Initialize the application
const root = ReactDOM.createRoot(
  document.getElementById('editor-root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <EditorSandbox />
  </React.StrictMode>
);
