import React, { useState } from 'react';
import { Box, ToggleButton, ToggleButtonGroup, Tooltip, Divider, Collapse, Paper, Typography, CircularProgress, Popper, ButtonGroup, Button } from '@mui/material';
import {
  Spellcheck as SpellcheckIcon,
  Summarize as SummaryIcon,
  Transform as RephraseIcon,
  Security as RedactIcon,
  Highlight as SmartHighlightIcon,
  Language as LanguageIcon,
} from '@mui/icons-material';

interface AIFeatureButtonsProps {
  isTextSelected: boolean;
  onAction: (action: string | null, currentTarget?: HTMLElement) => void;
  onToneSelect: (tone: string) => void;
  onLanguageSelect: (lang: string) => void;
  currentAction: string | null;
  summary: string;
  isLoading: boolean;
  rephraseAnchorEl: null | HTMLElement;
  languageAnchorEl: null | HTMLElement;
}

const AIFeatureButtons: React.FC<AIFeatureButtonsProps> = ({
  isTextSelected,
  onAction,
  onToneSelect,
  onLanguageSelect,
  currentAction,
  summary,
  isLoading,
  rephraseAnchorEl,
  languageAnchorEl,
}) => {

    const handleActionChange = (
    event: React.MouseEvent<HTMLElement>,
    newAction: string | null,
  ) => {
    onAction(newAction, event.currentTarget);
  };

      const handleToneSelect = (tone: string) => {
    onToneSelect(tone);
    onAction(null);
  };

        const handleLanguageSelect = (lang: string) => {
    onLanguageSelect(lang);
    onAction(null);
  };

  const buttonStyle = {
    p: 1,
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ p: 1, display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <ToggleButtonGroup
        orientation="horizontal"
        value={currentAction}
        exclusive
        onChange={handleActionChange}
        aria-label="ai actions group 1"
      >
        <Tooltip title="Spell Check" placement="left">
          <ToggleButton value="spell-check" aria-label="spell check" sx={buttonStyle}>
            <SpellcheckIcon />
          </ToggleButton>
        </Tooltip>
        <Tooltip title="Summarize Document" placement="left">
          <ToggleButton value="summarize" aria-label="summarize document" sx={buttonStyle}>
            <SummaryIcon />
          </ToggleButton>
        </Tooltip>
                <Tooltip title="Rephrase Selection (requires text selection)" placement="left">
          <span>
            <ToggleButton value="rephrase" aria-label="rephrase selection" sx={buttonStyle} disabled={!isTextSelected}>
              <RephraseIcon />
            </ToggleButton>
          </span>
        </Tooltip>
        <Tooltip title="Redact Sensitive Data" placement="left">
          <ToggleButton value="redact" aria-label="redact sensitive data" sx={buttonStyle}>
            <RedactIcon />
          </ToggleButton>
        </Tooltip>
      </ToggleButtonGroup>

      <Divider orientation="vertical" flexItem />

      <ToggleButtonGroup
        orientation="horizontal"
        value={currentAction}
        exclusive
        onChange={handleActionChange}
        aria-label="ai actions group 2"
      >
        <Tooltip title="Smart Highlight" placement="left">
          <ToggleButton value="smart-highlight" aria-label="smart highlight" sx={buttonStyle}>
            <SmartHighlightIcon />
          </ToggleButton>
        </Tooltip>
                <Tooltip title="Translate" placement="left">
          <ToggleButton value="translate" aria-label="translate" sx={buttonStyle}>
            <LanguageIcon />
          </ToggleButton>
        </Tooltip>
      </ToggleButtonGroup>
      </Box>
      <Popper open={Boolean(rephraseAnchorEl)} anchorEl={rephraseAnchorEl} placement="bottom" sx={{ zIndex: 1200 }}>
        <Paper elevation={3} sx={{ mt: 1 }}>
          <ButtonGroup size="small" aria-label="rephrase tone options">
            <Button onClick={() => handleToneSelect('formal')}>Formal</Button>
            <Button onClick={() => handleToneSelect('concise')}>Concise</Button>
            <Button onClick={() => handleToneSelect('simple')}>Simple</Button>
          </ButtonGroup>
        </Paper>
      </Popper>

      <Popper open={Boolean(languageAnchorEl)} anchorEl={languageAnchorEl} placement="bottom" sx={{ zIndex: 1200 }}>
        <Paper elevation={3} sx={{ mt: 1 }}>
          <ButtonGroup size="small" aria-label="language options">
            <Button onClick={() => handleLanguageSelect('en')}>🇬🇧 English</Button>
            <Button onClick={() => handleLanguageSelect('fr')}>🇫🇷 French</Button>
            <Button onClick={() => handleLanguageSelect('sw')}>🇰🇪 Swahili</Button>
            <Button onClick={() => handleLanguageSelect('ar')}>🇸🇦 Arabic</Button>
          </ButtonGroup>
        </Paper>
      </Popper>

      <Collapse in={currentAction === 'summarize'}>
        <Paper elevation={2} sx={{ p: 2, mt: 1, mx: 1 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {summary}
            </Typography>
          )}
        </Paper>
      </Collapse>
    </Box>
  );
};

export default AIFeatureButtons;
