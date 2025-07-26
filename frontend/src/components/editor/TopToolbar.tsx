import React from 'react';
import { MdHistory } from "react-icons/md";
import { FiMessageCircle, FiShare2, FiDownload, FiUpload } from "react-icons/fi";

// Reusable IconButton component (with tooltip)
const IconButton = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button
    title={label}
    onClick={onClick}
    style={{
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '8px',
      borderRadius: '6px',
      transition: 'background 0.2s',
      fontSize: '1.2rem',
      color: '#333'
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f1f1')}
    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
  >
    {icon}
  </button>
);

const TopToolbar = () => {
  return (
    <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', marginBottom: '12px', alignItems: 'center' }}>
      <IconButton icon={<MdHistory />} label="Last Edited" onClick={() => console.log('Show last edited')} />
      <IconButton icon={<FiMessageCircle />} label="View All Comments" onClick={() => console.log('View comments')} />
      <IconButton icon={<FiShare2 />} label="Share Document" onClick={() => console.log('Share doc')} />
      <IconButton icon={<FiDownload />} label="Export Document" onClick={() => console.log('Export doc')} />
      <IconButton icon={<FiUpload />} label="Upload File" onClick={() => console.log('Upload file')} />
    </div>
  );
};

export default TopToolbar;
