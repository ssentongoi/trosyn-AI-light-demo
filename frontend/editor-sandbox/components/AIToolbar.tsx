import React, { useState } from 'react';
import { ToggleButton, ToggleButtonGroup, Tooltip, Box, Divider } from '@mui/material';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import SummarizeIcon from '@mui/icons-material/Summarize';
import EditIcon from '@mui/icons-material/Edit';
import SecurityIcon from '@mui/icons-material/Security';
import HighlightIcon from '@mui/icons-material/Highlight';
import LanguageIcon from '@mui/icons-material/Language';

const tools = [
  { value: 'spell-check', label: 'Spell Check', icon: <SpellcheckIcon fontSize="small" /> },
  { value: 'summarize', label: 'Summarize', icon: <SummarizeIcon fontSize="small" /> },
  { value: 'rewrite', label: 'Rewrite / Rephrase', icon: <EditIcon fontSize="small" /> },
  { value: 'redact', label: 'Redact Sensitive Data', icon: <SecurityIcon fontSize="small" /> },
  { value: 'highlight', label: 'Smart Highlight', icon: <HighlightIcon fontSize="small" /> },
  { value: 'language', label: 'Language Switch', icon: <LanguageIcon fontSize="small" /> },
];

interface AIToolbarProps {
  onActionSelect: (action: string) => void;
}

const AIToolbar: React.FC<AIToolbarProps> = ({ onActionSelect }) => {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const handleToolChange = (
    event: React.MouseEvent<HTMLElement>,
    newTool: string | null,
  ) => {
    setSelectedTool(newTool);
    if (newTool) {
      onActionSelect(newTool);
    }
  };

  return (
    <Box sx={{ padding: '8px', borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
      <ToggleButtonGroup
        value={selectedTool}
        exclusive
        onChange={handleToolChange}
        aria-label="AI Tools"
        size="small"
        sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
      >
        {tools.map((tool) => (
          <Tooltip title={tool.label} key={tool.value}>
            <ToggleButton value={tool.value} aria-label={tool.label} sx={{ borderRadius: '20px !important', border: '1px solid rgba(0,0,0,0.12) !important' }}>
              {tool.icon}
            </ToggleButton>
          </Tooltip>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
};

export default AIToolbar;
