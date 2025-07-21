import React from 'react';

const TestApp: React.FC = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🎉 React App is Working!</h1>
      <p>Authentication has been successfully bypassed.</p>
      <p>The editor page should now load without requiring login.</p>
      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        backgroundColor: '#e8f5e8', 
        border: '1px solid #4caf50',
        borderRadius: '4px'
      }}>
        <strong>✅ Success:</strong> React is mounting correctly and authentication is bypassed.
      </div>
    </div>
  );
};

export default TestApp;
