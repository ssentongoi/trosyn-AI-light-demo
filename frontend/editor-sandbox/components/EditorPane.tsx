import React from 'react';
import SimpleEditor from '../SimpleEditor';
import { Page } from '../types';

interface EditorPaneProps {
  selectedPage: Page;
  onPageUpdate: (updatedPage: Page) => void;
}

const EditorPane = ({ selectedPage, onPageUpdate }: EditorPaneProps) => {
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPageUpdate({ ...selectedPage, title: e.target.value });
  };

  return (
    <div style={{
      flex: 1,
      padding: '20px 96px',
      display: 'flex',
      justifyContent: 'center',
      overflowY: 'auto'
    }}>
      <div style={{ width: '100%', maxWidth: '800px' }}>
        <input
          type="text"
          value={selectedPage.title}
          onChange={handleTitleChange}
          style={{
            width: '100%',
            border: 'none',
            backgroundColor: 'transparent',
            color: '#333',
            fontSize: '40px',
            fontWeight: 'bold',
            marginBottom: '24px',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <SimpleEditor placeholder="What's on your mind?" />
      </div>
    </div>
  );
};

export default EditorPane;
