import React from 'react';
import { Page } from '../types';

interface TopBarProps {
  selectedPage: Page;
}

const TopBar = ({ selectedPage }: TopBarProps) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 20px',
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid #E0E0E0',
      color: '#333',
      fontFamily: 'sans-serif'
    }}>
      <div>
        <span style={{ cursor: 'pointer', color: '#666' }}>ivanssentongo / </span>
        <span style={{ cursor: 'pointer' }}>{selectedPage.title}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ cursor: 'pointer' }}>Share</span>
        <span style={{ cursor: 'pointer' }}>...</span>
      </div>
    </div>
  );
};

export default TopBar;
