import React, { useState, useRef, useEffect } from 'react';
import { Box, Container, Typography, Snackbar, Alert } from '@mui/material';
import { Article as ArticleIcon } from '@mui/icons-material';
import { OutputData } from '@editorjs/editorjs';

import LeftSidebar from './LeftSidebar';
import TopBar from './TopBar';
import AIActionModal from './AIActionModal';
import RightSidebar from './RightSidebar';
import FloatingInfoPanel from './FloatingInfoPanel';
import SimpleEditor, { EditorInstance } from '../SimpleEditor';

import { processTextWithAI, getAIChatResponse } from '../services/mockAIService';
import { Page, Message } from '../types';

import styles from '../styles/EditorPage.module.css';
import '../styles/editor-custom.css';

// This would typically come from a database or API
const TABS_STORAGE_KEY = 'editor_tabs';
const DATA_STORAGE_KEY = 'editor_data';

const defaultTabs = [
  { id: '1', title: 'Getting Started', icon: <ArticleIcon fontSize="small" /> },
];

const EditorPage: React.FC = () => {
  const [tabs, setTabs] = useState<Page[]>(() => {
    const savedTabs = localStorage.getItem(TABS_STORAGE_KEY);
    const loadedTabs = savedTabs ? JSON.parse(savedTabs) : defaultTabs;
    return loadedTabs.length > 0 ? loadedTabs : defaultTabs;
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0]?.id || '1');

  const [editorData, setEditorData] = useState<Record<string, any>>(() => {
    const savedData = localStorage.getItem(DATA_STORAGE_KEY);
    return savedData ? JSON.parse(savedData) : {};
  });

  const editorRef = useRef<EditorInstance>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiError, setAIError] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useEffect(() => {
    // Save tabs whenever they change
    localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
    // Update active tab if the current one is deleted
    if (tabs.length > 0 && !tabs.find(t => t.id === activeTabId)) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  useEffect(() => {
    // Debounced save for editor data
    const handler = setTimeout(() => {
      localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(editorData));
    }, 1000);

    return () => {
      clearTimeout(handler);
    };
  }, [editorData]);

  const activePage = tabs.find(tab => tab.id === activeTabId) || tabs[0];

  const handleAddTab = () => {
    const newTabId = (Date.now()).toString(); // Use a more unique ID
    const newTab = { id: newTabId, title: `New Page`, icon: <ArticleIcon fontSize="small" /> };
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
          setActiveTabId(''); // No tabs left
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
      console.log('Content for tab', activeTabId, 'saved:', savedData);
    }
  };

  const handleAskAI = () => {
    setIsPanelOpen(true);
  };

  const handleSelectAIAction = async (action: string) => {
    if (!editorRef.current || !activeTabId) return;

    setIsAILoading(true);
    try {
      const content = await editorRef.current.save();
      const processedContent = await processTextWithAI(action, content);
      await editorRef.current.render(processedContent);
    } catch (error) { 
      console.error('Error processing AI action:', error);
      if (error instanceof Error) {
        setAIError(error.message);
      }
    } finally {
      setIsAILoading(false);
      setIsAIModalOpen(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    try {
    const userMessage: Message = { id: Date.now().toString(), sender: 'user', text };
    setMessages(prev => [...prev, userMessage]);

    const aiResponseText = await getAIChatResponse(text);
    const aiMessage: Message = { id: (Date.now() + 1).toString(), sender: 'ai', text: aiResponseText };
    setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting AI chat response:', error);
      if (error instanceof Error) {
        setAIError(error.message);
      }
    }
  };

  const handleEditorChange = (data: OutputData) => {
    // Only save if there is content to prevent overwriting with empty data
    if (data.blocks.length > 0) {
      setEditorData(prevData => ({
        ...prevData,
        [activeTabId]: data,
      }));
    }
  };

  const handleSendToEditor = (text: string) => {
    if (editorRef.current) {
      editorRef.current.insertBlock('paragraph', { text });
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    // Implement snackbar logic here
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
              page={activePage as Page}
              onTitleChange={handleTitleChange}
              onSave={handleSave}
              onExport={() => console.log('Export clicked')}
              onAskAI={handleAskAI}
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
        loading={isAILoading}
        onClose={() => !isAILoading && setIsAIModalOpen(false)}
        onSelectAction={handleSelectAIAction}
      />

      <FloatingInfoPanel 
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        title="AI Assistant"
      >
        <RightSidebar 
          messages={messages}
          onSendMessage={handleSendMessage}
          onSendToEditor={handleSendToEditor}
        />
      </FloatingInfoPanel>

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
    </div>
  );
};

export default EditorPage;
