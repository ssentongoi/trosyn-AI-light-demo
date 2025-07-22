import React, { useState, useRef, useEffect } from 'react';
import { Box, Container, Typography, Snackbar, Alert } from '@mui/material';
import { Article as ArticleIcon } from '@mui/icons-material';
import { OutputData } from '@editorjs/editorjs';

import LeftSidebar from './LeftSidebar';
import TopBar from './TopBar';
import AIActionModal from './AIActionModal';

import AIPanel from './AIPanel';
import SimpleEditor, { EditorInstance } from '../SimpleEditor';

import { Page, Message } from '../types';

import styles from '../styles/EditorPage.module.css';
import '../styles/editor-custom.css';

// This would typically come from a database or API
const TABS_STORAGE_KEY = 'editor_tabs';
const DATA_STORAGE_KEY = 'editor_data';

const defaultTabs: Page[] = [
  { id: '1', title: 'Getting Started', icon: <ArticleIcon fontSize="small" /> },
];

const EditorPage: React.FC = () => {
  const [tabs, setTabs] = useState<Page[]>(() => {
    try {
      const savedTabs = localStorage.getItem(TABS_STORAGE_KEY);
      const loaded = savedTabs ? JSON.parse(savedTabs) : defaultTabs;
      return loaded.length > 0 ? loaded : defaultTabs;
    } catch {
      return defaultTabs;
    }
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0]?.id || '1');

  const [editorData, setEditorData] = useState<Record<string, any>>(() => {
    try {
      const savedData = localStorage.getItem(DATA_STORAGE_KEY);
      return savedData ? JSON.parse(savedData) : {};
    } catch {
      return {};
    }
  });

  const editorRef = useRef<EditorInstance>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);
  const [lastEdited, setLastEdited] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
    if (tabs.length > 0 && !tabs.find(t => t.id === activeTabId)) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  useEffect(() => {
    const handler = setTimeout(() => {
      localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(editorData));
    }, 1000);

    return () => clearTimeout(handler);
  }, [editorData]);

  const activePage = tabs.find(tab => tab.id === activeTabId);

  const handleAddTab = () => {
    const newTabId = Date.now().toString();
    const newTab: Page = { id: newTabId, title: `New Page`, icon: <ArticleIcon fontSize="small" /> };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTabId);
  };

  const handleSelectTab = async (tabId: string) => {
    if (editorRef.current && activeTabId !== tabId) {
      const savedData = await editorRef.current.save();
      setEditorData(prevData => ({ ...prevData, [activeTabId]: savedData }));
    }
    setActiveTabId(tabId);
  };

  const handleDeleteTab = (tabIdToDelete: string) => {
    if (window.confirm('Are you sure you want to delete this page?')) {
      const tabIndex = tabs.findIndex(tab => tab.id === tabIdToDelete);
      const newTabs = tabs.filter(tab => tab.id !== tabIdToDelete);
      
      setTabs(newTabs);
      setEditorData(prevData => {
        const newData = { ...prevData };
        delete newData[tabIdToDelete];
        return newData;
      });

      if (activeTabId === tabIdToDelete) {
        if (newTabs.length > 0) {
          const newActiveIndex = Math.max(0, tabIndex - 1);
          setActiveTabId(newTabs[newActiveIndex].id);
        } else {
          setActiveTabId('');
        }
      }
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setTabs(tabs.map(tab => tab.id === activeTabId ? { ...tab, title: newTitle } : tab));
  };

  const handleSave = async () => {
    if (editorRef.current && activeTabId) {
      const savedData = await editorRef.current.save();
      setEditorData(prevData => ({ ...prevData, [activeTabId]: savedData }));
      setLastEdited(new Date().toISOString());
      console.log('Content saved');
    }
  };

  const handleEditorChange = (data: OutputData) => {
    if (data.blocks.length > 0) {
      setEditorData(prevData => ({ ...prevData, [activeTabId]: data }));
    }
  };

    const handleAskAI = () => {
    setIsAIPanelOpen(true);
  };

  const handleSelectAIAction = (action: string) => {
    console.log(`AI action selected: ${action}`);
    setIsAIModalOpen(false);
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('Selected file:', file.name);
      // Future: process file content
    }
  };

    const handleToggleComments = () => {
    // This will be implemented later. For now, it does nothing.
    console.log('Toggle comments clicked');
  };

  return (
    <div className={styles.editorPageContainer}>
      <div className={styles.leftPane}>
        <LeftSidebar 
          tabs={tabs}
          activeTabId={activeTabId}
          onAddTab={handleAddTab}
          onSelectTab={handleSelectTab}
          onDeleteTab={handleDeleteTab}
        />
      </div>
      <main className={styles.centerPane}>
        {activePage ? (
          <>
            <TopBar
              page={activePage}
              onTitleChange={handleTitleChange}
              onSave={handleSave}
              onExport={() => console.log('Export clicked')}
              onAskAI={handleAskAI}
              lastEdited={lastEdited}
              onToggleComments={handleToggleComments}
              onUpload={handleUpload}
            />
            <Container maxWidth="md" sx={{ flexGrow: 1, paddingTop: '2rem', paddingBottom: '2rem' }}>
              <SimpleEditor 
                key={activeTabId} 
                ref={editorRef}
                holder={`editor-container-${activePage.id}`}
                initialData={editorData[activePage.id] || null}
                onChange={handleEditorChange}
                placeholder="Start writing your story..." 
              />
            </Container>
          </>
        ) : (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="h6">No pages available</Typography>
            <Typography variant="body1">Create a new page to get started.</Typography>
          </Box>
        )}
      </main>
      
      

      <AIActionModal 
        open={isAIModalOpen}
        loading={false}
        onClose={() => setIsAIModalOpen(false)}
        onSelectAction={handleSelectAIAction}
      />

      <Snackbar 
        open={!!aiError}
        autoHideDuration={6000}
        onClose={() => setAIError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setAIError(null)} severity="error" sx={{ width: '100%' }}>
          {aiError}
        </Alert>
      </Snackbar>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept=".txt,.md,.docx,.pdf"
      />

            <AIPanel
        isOpen={isAIPanelOpen}
        onClose={() => setIsAIPanelOpen(false)}
      />
    </div>
  );
};

export default EditorPage;
