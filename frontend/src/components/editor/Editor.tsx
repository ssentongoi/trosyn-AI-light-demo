import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  SxProps,
  Theme,
  CircularProgress,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery,
  Button,
  Divider,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import SaveIcon from '@mui/icons-material/Save';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { EditorToolbar } from './EditorToolbar';
import { useEditor, UseEditorProps } from './hooks/useEditor';
import { StatusPopup } from '../common/StatusPopup';
import DocumentService from '../../services/DocumentService';

export interface EditorProps extends UseEditorProps {
  sx?: SxProps<Theme>;
  'data-testid'?: string;
}

export const Editor: React.FC<EditorProps> = ({
  documentId,
  initialContent,
  readOnly = false,
  placeholder = 'Type here...',
  sx = {},
  autosave = true,
  onSave,
  'data-testid': testId = 'editor-container',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const editorContainerRef = useRef<HTMLDivElement>(null);
  
  // Status popup state
  const [popupState, setPopupState] = useState({
    open: false,
    message: '',
  });
  
  // Export menu state
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const exportMenuOpen = Boolean(exportAnchorEl);

  const {
    isEditorReady,
    isSaving,
    doc,
    initializeEditor,
    handleSave: handleEditorSave,
    editorRef,
    handleFormat,
    isFormatActive,
  } = useEditor({
    documentId,
    initialContent,
    readOnly,
    placeholder,
    autosave,
    onSave,
  });

  const showPopup = (message: string) => {
    setPopupState({ open: true, message });
  };

  const handlePopupClose = () => {
    setPopupState(prev => ({ ...prev, open: false }));
  };
  
  const handleExportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setExportAnchorEl(event.currentTarget);
  };
  
  const handleExportMenuClose = () => {
    setExportAnchorEl(null);
  };
  
  const handleExportFormat = (format: 'html' | 'md' | 'txt') => {
    handleExport(format);
    handleExportMenuClose();
  };

  const handleSave = async () => {
    try {
      showPopup('Saving document...');
      const content = await editorRef.current?.save();
      if (content) {
        const savedDoc = await DocumentService.saveDocument(JSON.stringify(content), doc?.file_path);
        showPopup('Document saved successfully!');
        // Optionally update state with the new file path
      }
    } catch (error) { 
      console.error('Error saving document:', error);
      showPopup(`Error: ${error.message || 'Could not save document'}`);
    }
  };

  const handleLoad = async () => {
    try {
      showPopup('Loading document...');
      const loadedDoc = await DocumentService.loadDocumentWithDialog();
      if (loadedDoc && editorRef.current) {
        editorRef.current.render(JSON.parse(loadedDoc.content));
        showPopup('Document loaded!');
      }
    } catch (error) {
      console.error('Error loading document:', error);
      showPopup(`Error: ${error.message || 'Could not load document'}`);
    }
  };

  const handleExport = async (format: 'html' | 'md' | 'txt') => {
    try {
      showPopup(`Exporting to ${format.toUpperCase()}...`);
      const content = await editorRef.current?.save();
      if (content) {
        await DocumentService.exportDocument(JSON.stringify(content), format);
        showPopup('Export successful!');
      }
    } catch (error) {
      console.error('Error exporting document:', error);
      showPopup(`Error: ${error.message || 'Could not export document'}`);
    }
  };

  useEffect(() => {
    if (editorContainerRef.current) {
      initializeEditor(editorContainerRef.current);
    }
  }, [initializeEditor]);

  if (!doc && !initialContent) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
        data-testid={`${testId}-loading`}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div>
      <Box
        data-testid={testId}
        ref={editorContainerRef}
        component="div"
        sx={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          overflow: 'hidden',
          '& .codex-editor__redactor': {
            paddingBottom: '100px !important',
          },
          '& .ce-block__content': {
            maxWidth: '800px',
            margin: '0 auto',
            padding: '0 16px',
          },
          '& .ce-toolbar__content': {
            maxWidth: 'unset',
          },
          '& .ce-toolbar__actions': {
            right: '16px',
          },
          ...sx,
        }}
      >
        {!readOnly && isEditorReady && (
          <>
            <EditorToolbar 
              onFormat={handleFormat} 
              isFormatActive={isFormatActive} 
              disabled={!isEditorReady} 
            />
            <Divider />
          </>
        )}

        <Box
          id="editorjs"
          sx={{
            flex: 1,
            overflow: 'auto',
            padding: 2,
            '& .codex-editor': {
              height: '100%',
            },
            '& .ce-block__content': {
              maxWidth: '800px',
              margin: '0 auto',
            },
            '& .ce-header': {
              margin: '1.5em 0 0.5em',
              '&:first-of-type': {
                marginTop: '0.5em',
              },
            },
            '& .ce-paragraph': {
              lineHeight: 1.6,
              margin: '1em 0',
            },
          }}
        />

        {!readOnly && isEditorReady && (
          <Box
            component="div"
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 10,
              display: 'flex',
              gap: 1,
              opacity: isSaving ? 1 : 0.8,
              transition: 'opacity 0.2s',
              '&:hover': {
                opacity: 1,
              },
            }}
          >
            <Box sx={{ display: 'flex', gap: 1 }}>
              <LoadingButton
                variant="contained"
                color="primary"
                onClick={handleSave}
                loading={isSaving}
                loadingPosition="start"
                startIcon={<SaveIcon />}
                sx={{
                  borderRadius: 2,
                  boxShadow: 3,
                  '&.MuiLoadingButton-loading': {
                    backgroundColor: theme.palette.primary.main,
                    color: 'transparent',
                  },
                }}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </LoadingButton>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleLoad}
                disabled={isSaving}
                startIcon={<FolderOpenIcon />}
                sx={{
                  borderRadius: 2,
                  boxShadow: 1,
                  '&:hover': {
                    boxShadow: 2,
                  },
                }}
              >
                Load
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleExportMenuOpen}
                disabled={isSaving}
                startIcon={<FileDownloadIcon />}
                sx={{
                  borderRadius: 2,
                  boxShadow: 1,
                  '&:hover': {
                    boxShadow: 2,
                  },
                }}
              >
                Export
              </Button>
            </Box>
          </Box>
        )}

        <StatusPopup
          open={popupState.open}
          message={popupState.message}
          onClose={handlePopupClose}
          duration={2000}
        />
        
        <Menu
          anchorEl={exportAnchorEl}
          open={exportMenuOpen}
          onClose={handleExportMenuClose}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <MenuItem onClick={() => handleExportFormat('html')}>
            <ListItemIcon>
              <FileDownloadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Export as HTML</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleExportFormat('md')}>
            <ListItemIcon>
              <FileDownloadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Export as Markdown</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleExportFormat('txt')}>
            <ListItemIcon>
              <FileDownloadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Export as Text</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </div>
  );
};

export default Editor;