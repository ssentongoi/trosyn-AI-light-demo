import React, { useState } from 'react';

import { Page } from '../types';

interface SidebarItemProps {
  page: Page;
  onSelect: (page: Page) => void;
  isSelected: boolean | undefined;
}

const SidebarItem = ({ page, onSelect, isSelected }: SidebarItemProps) => (
  <div 
    onClick={() => onSelect(page)}
    style={{
      padding: '6px 12px 6px 28px',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      fontSize: '14px',
      backgroundColor: isSelected ? '#E8E8E8' : 'transparent',
    }} 
    onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#F0F0F0'}}
    onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'}}
  >
    <span style={{ marginRight: '8px' }}>{page.icon}</span>
    <span>{page.title}</span>
  </div>
);

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
}

const CollapsibleSection = ({ title, children }: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div style={{ marginBottom: '16px' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          padding: '4px 8px',
          color: '#666',
          fontSize: '14px',
          fontWeight: '500',
        }}
      >
        <span style={{ 
          transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          marginRight: '4px',
          width: '16px',
          textAlign: 'center',
        }}>›</span>
        <span>{title}</span>
      </div>
      {isOpen && <div style={{ paddingTop: '4px' }}>{children}</div>}
    </div>
  );
}

interface SidebarProps {
  pages: {
    shared: Page[];
    private: Page[];
  };
  onSelectPage: (page: Page) => void;
  selectedPage: Page | undefined;
}

const Sidebar = ({ pages, onSelectPage, selectedPage }: SidebarProps) => {
  return (
    <div style={{
      width: '270px',
      minWidth: '270px',
      height: '100vh',
      backgroundColor: '#F7F7F7',
      color: '#333',
      padding: '16px',
      borderRight: '1px solid #E0E0E0',
      fontFamily: 'sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <CollapsibleSection title="Shared">
        {pages.shared.map(page => 
          <SidebarItem 
            key={page.id} 
            page={page} 
            onSelect={onSelectPage} 
            isSelected={selectedPage?.id === page.id} 
          />
        )}
      </CollapsibleSection>
      <CollapsibleSection title="Private">
        {pages.private.map(page => 
          <SidebarItem 
            key={page.id} 
            page={page} 
            onSelect={onSelectPage} 
            isSelected={selectedPage?.id === page.id} 
          />
        )}
      </CollapsibleSection>
    </div>
  );
};

export default Sidebar;
