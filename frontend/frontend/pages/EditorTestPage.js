import React, { useCallback } from 'react';
import EditorComponent from '../components/EditorComponent';

const EditorTestPage = () => {
  const handleEditorError = useCallback((error) => {
    console.error('Editor error:', error);
    // You could also show a user-friendly error message here
  }, []);

  // Example of initial data you might want to load
  const initialData = {
    time: new Date().getTime(),
    blocks: [
      {
        type: 'header',
        data: {
          text: 'Welcome to the Editor',
          level: 2
        }
      },
      {
        type: 'paragraph',
        data: {
          text: 'Start typing here...'
        }
      }
    ]
  };

  return (
    <div className="editor-page">
      <header className="editor-header">
        <h1>Editor.js Test Page</h1>
        <p>Try editing the content below</p>
      </header>
      
      <main className="editor-main">
        <div className="editor-wrapper">
          <EditorComponent 
            onError={handleEditorError}
            initialData={initialData}
          />
        </div>
      </main>
      
      <style jsx>{`
        .editor-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        .editor-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        
        .editor-main {
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          padding: 2rem;
        }
        
        .editor-wrapper {
          min-height: 500px;
        }
        
        /* Add any additional styles for the editor container */
        :global(.editor-container) {
          position: relative;
        }
        
        :global(.editor-loading) {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #666;
        }
        
        :global(.editor-error) {
          color: #d32f2f;
          background-color: #fde7e9;
          padding: 1rem;
          border-radius: 4px;
          margin: 1rem 0;
        }
      `}</style>
    </div>
  );
};

export default EditorTestPage;
