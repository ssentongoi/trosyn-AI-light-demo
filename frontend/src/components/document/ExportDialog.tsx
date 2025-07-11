import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  TextField,
  Box,
  Typography,
  Divider,
  FormControlLabel,
  Checkbox,
  Alert,
  AlertTitle,
} from '@mui/material';
import { Document } from '@/types/tauri';
import { documentUtils } from '@/utils/documentUtils';
import { saveAs } from 'file-saver';
import { isTauri } from '@/utils/environment';

type ExportFormat = 'html' | 'markdown' | 'pdf' | 'txt' | 'json';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  document: Document;
}

const ExportDialog: React.FC<ExportDialogProps> = ({ open, onClose, document }) => {
  const [format, setFormat] = useState<ExportFormat>('html');
  const [fileName, setFileName] = useState(document.title);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFormatChange = (event: SelectChangeEvent) => {
    setFormat(event.target.value as ExportFormat);
  };

  const handleFileNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFileName(event.target.value);
  };

  const getFileExtension = (): string => {
    switch (format) {
      case 'html':
        return '.html';
      case 'markdown':
        return '.md';
      case 'pdf':
        return '.pdf';
      case 'json':
        return '.json';
      case 'txt':
      default:
        return '.txt';
    }
  };

  const formatContent = (): string => {
    const metadata = includeMetadata
      ? `<!-- 
Exported from Trosyn AI
Document: ${document.title}
Created: ${new Date(document.createdAt).toLocaleString()}
Last Updated: ${new Date(document.updatedAt).toLocaleString()}
-->

`
      : '';

    switch (format) {
      case 'html':
        return `${metadata}<html>
  <head>
    <title>${document.title}</title>
    <meta charset="UTF-8">
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
      h1 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; }
      .content { margin-top: 20px; }
    </style>
  </head>
  <body>
    <h1>${document.title}</h1>
    <div class="content">
      ${document.content.blocks?.map(block => {
        switch (block.type) {
          case 'header':
            return `<h${block.data.level}>${block.data.text}</h${block.data.level}>`;
          case 'paragraph':
            return `<p>${block.data.text}</p>`;
          case 'list':
            const tag = block.data.style === 'ordered' ? 'ol' : 'ul';
            return `<${tag}>${block.data.items.map((item: string) => `<li>${item}</li>`).join('')}</${tag}>`;
          default:
            return '';
        }
      }).join('\n')}
    </div>
  </body>
</html>`;

      case 'markdown':
        return metadata + document.content.blocks?.map(block => {
          switch (block.type) {
            case 'header':
              return `${'#'.repeat(block.data.level)} ${block.data.text}\n\n`;
            case 'paragraph':
              return `${block.data.text}\n\n`;
            case 'list':
              return block.data.items.map((item: string) => 
                `${block.data.style === 'ordered' ? '1. ' : '- '}${item}`
              ).join('\n') + '\n\n';
            default:
              return '';
          }
        }).join('');

      case 'json':
        return JSON.stringify({
          ...(includeMetadata && {
            metadata: {
              title: document.title,
              createdAt: document.createdAt,
              updatedAt: document.updatedAt,
            }
          }),
          content: document.content,
        }, null, 2);

      case 'txt':
      default:
        return metadata + document.content.blocks?.map(block => {
          switch (block.type) {
            case 'header':
              return `${block.data.text}\n${'='.repeat(block.data.text.length)}\n\n`;
            case 'paragraph':
              return `${block.data.text}\n\n`;
            case 'list':
              return block.data.items.map((item: string) => 
                `${block.data.style === 'ordered' ? '1. ' : '- '}${item}`
              ).join('\n') + '\n\n';
            default:
              return '';
          }
        }).join('');
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);
      
      const content = formatContent();
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const extension = getFileExtension();
      const fullFileName = fileName.endsWith(extension) 
        ? fileName 
        : `${fileName}${extension}`;

      if (isTauri()) {
        // In Tauri, we can use the native file save dialog
        const { save } = await import('@tauri-apps/api/dialog');
        const { writeTextFile } = await import('@tauri-apps/api/fs');
        
        const filePath = await save({
          defaultPath: fullFileName,
          filters: [{
            name: format.toUpperCase(),
            extensions: [format],
          }],
        });
        
        if (filePath) {
          await writeTextFile(filePath, content);
        }
      } else {
        // In browser, use file-saver
        saveAs(blob, fullFileName);
      }
      
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
      setError(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Export Document</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>Export Error</AlertTitle>
            {error}
          </Alert>
        )}
        
        <Box mb={3}>
          <Typography variant="subtitle1" gutterBottom>
            Export Options
          </Typography>
          <Divider />
        </Box>
        
        <Box mb={3}>
          <FormControl fullWidth variant="outlined" size="small" sx={{ mb: 2 }}>
            <InputLabel>Format</InputLabel>
            <Select
              value={format}
              onChange={handleFormatChange}
              label="Format"
              disabled={isExporting}
            >
              <MenuItem value="html">HTML</MenuItem>
              <MenuItem value="markdown">Markdown</MenuItem>
              <MenuItem value="txt">Plain Text</MenuItem>
              <MenuItem value="json">JSON</MenuItem>
              {isTauri() && <MenuItem value="pdf">PDF (Tauri only)</MenuItem>}
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="File Name"
            value={fileName}
            onChange={handleFileNameChange}
            variant="outlined"
            size="small"
            disabled={isExporting}
            sx={{ mb: 2 }}
          />
          
          <FormControlLabel
            control={
              <Checkbox
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                color="primary"
                disabled={isExporting}
              />
            }
            label="Include document metadata"
          />
        </Box>
        
        <Box mt={2}>
          <Typography variant="subtitle2" color="text.secondary">
            File will be saved as: <strong>{fileName}{getFileExtension()}</strong>
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={isExporting}>
          Cancel
        </Button>
        <Button 
          onClick={handleExport} 
          color="primary" 
          variant="contained"
          disabled={isExporting || !fileName.trim()}
        >
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog;
