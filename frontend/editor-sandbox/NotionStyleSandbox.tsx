import React, { useState } from 'react';
import { Page, Pages } from './types';
import Sidebar from './components/Sidebar.tsx';
import TopBar from './components/TopBar.tsx';
import EditorPane from './components/EditorPane.tsx';

const initialPages: Pages = {
  shared: [
    { id: 's1', title: 'Ropita Design System', icon: '🎨' },
  ],
  private: [
    { id: 'p1', title: 'Genspark Integration', icon: '🔌' },
    { id: 'p2', title: 'UX Research Templates', icon: '📝' },
    { id: 'p3', title: 'Bible Class Notes', icon: '📖' },
    { id: 'p4', title: 'Best fonts for ui', icon: '✒️' },
    { id: 'p5', title: 'UX Projects', icon: '📁' },
  ],
};

const NotionStyleSandbox = () => {
  const [pages, setPages] = useState<Pages>(initialPages);
  const [selectedPage, setSelectedPage] = useState<Page | undefined>(pages.private[0]);

  const handlePageUpdate = (updatedPage: Page) => {
    const newPages = { ...pages };
    const privateIndex = newPages.private.findIndex(p => p.id === updatedPage.id);
    if (privateIndex !== -1) {
      newPages.private[privateIndex] = updatedPage;
    } else {
      const sharedIndex = newPages.shared.findIndex(p => p.id === updatedPage.id);
      if (sharedIndex !== -1) {
        newPages.shared[sharedIndex] = updatedPage;
      }
    }
    setPages(newPages);
    setSelectedPage(updatedPage);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#FFFFFF', color: '#333' }}>
      <Sidebar 
        pages={pages} 
        onSelectPage={setSelectedPage} 
        selectedPage={selectedPage} 
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedPage && <TopBar selectedPage={selectedPage} />}
        {selectedPage && <EditorPane selectedPage={selectedPage} onPageUpdate={handlePageUpdate} />}
      </div>
    </div>
  );
};

export default NotionStyleSandbox;
