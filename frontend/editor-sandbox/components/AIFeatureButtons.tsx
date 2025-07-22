import React, { useState } from 'react';
import { Box, ToggleButton, ToggleButtonGroup, Tooltip, Divider } from '@mui/material';
import {
  Spellcheck as SpellcheckIcon,
  Summarize as SummaryIcon,
  Transform as RephraseIcon,
  Security as RedactIcon,
  Highlight as SmartHighlightIcon,
  Language as LanguageIcon,
} from '@mui/icons-material';

const AIFeatureButtons: React.FC = () => {
  const [currentAction, setCurrentAction] = useState<string | null>(null);

  const handleActionChange = (
    event: React.MouseEvent<HTMLElement>,
    newAction: string | null,
  ) => {
    setCurrentAction(newAction);
    if (newAction) {
      console.log(`AI Action triggered: ${newAction}`);
      // Placeholder for calling askAI.handleAction(newAction, payload)
    }
  };

    const buttonStyle = {
    p: 1,
  };

    return (
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
        <Tooltip title="Rephrase Selection" placement="left">
          <ToggleButton value="rephrase" aria-label="rephrase selection" sx={buttonStyle}>
            <RephraseIcon />
          </ToggleButton>
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
  );
};

export default AIFeatureButtons;
