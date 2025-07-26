import React, { useState } from 'react';
import { Box, ToggleButton, ToggleButtonGroup, Tooltip, CircularProgress, Typography } from '@mui/material';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import SubjectIcon from '@mui/icons-material/Subject';
import EditNoteIcon from '@mui/icons-material/EditNote';
import SecurityIcon from '@mui/icons-material/Security';
import { useAI } from '../../hooks/useAI';

interface AIToolbarProps {
  getEditorContent: () => string;
  onActionComplete?: (result: any) => void;
  disabled?: boolean;
}

type AiAction = 'spellcheck' | 'summarize' | 'rephrase' | 'redact';

const AIToolbar: React.FC<AIToolbarProps> = ({ getEditorContent, onActionComplete, disabled }) => {
  const [activeAction, setActiveAction] = useState<AiAction | null>(null);
  const { executeTask, isLoading, error } = useAI();

  const handleActionToggle = async (event: React.MouseEvent<HTMLElement>, newAction: AiAction | null) => {
    if (isLoading) return;
    setActiveAction(newAction);

    if (newAction) {
      const content = getEditorContent();
      if (!content.trim()) {
        console.warn('No content to process');
        setActiveAction(null);
        return;
      }
      try {
        const result = await executeTask(newAction, content);
        if (result && onActionComplete) {
          onActionComplete({ action: newAction, result });
        }
      } catch (err) {
        console.error(`Error performing ${newAction}:`, err);
      } finally {
        // Keep it active to show loading, or deactivate on finish if desired
        // setActiveAction(null); 
      }
    }
  };

  const isActionLoading = (action: AiAction) => isLoading && activeAction === action;

  const buttons = [
    { value: 'spellcheck', label: 'Spell Check', icon: <SpellcheckIcon /> },
    { value: 'summarize', label: 'Summary', icon: <SubjectIcon /> },
    { value: 'rephrase', label: 'Rephrase / Rewrite', icon: <EditNoteIcon /> },
    { value: 'redact', label: 'Redact Sensitive Data', icon: <SecurityIcon /> },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', p: 1 }}>
      <ToggleButtonGroup
        orientation="horizontal"
        value={activeAction}
        exclusive
        onChange={handleActionToggle}
        aria-label="AI Actions"
        disabled={disabled || isLoading}
      >
        {buttons.map((btn) => (
          <Tooltip title={btn.label} placement="bottom" key={btn.value}>
            <ToggleButton value={btn.value} aria-label={btn.label} sx={{ width: '40px', height: '40px', mr: '4px' }}>
              {isActionLoading(btn.value as AiAction) ? <CircularProgress size={24} /> : btn.icon}
            </ToggleButton>
          </Tooltip>
        ))}
      </ToggleButtonGroup>
      {error && (
        <Typography color="error" variant="caption" mt={1} textAlign="center">
          {error}
        </Typography>
      )}
    </Box>
  );
};

export default AIToolbar;
