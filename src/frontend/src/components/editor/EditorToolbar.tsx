import React from 'react';
import {
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  IconButton,
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  Code,
  Link,
  FormatQuote,
  FormatListBulleted,
  FormatListNumbered,
  CheckBox,
  TableChart,
  Image,
  MoreVert,
  Title,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatAlignJustify,
  Highlight,
} from '@mui/icons-material';

type FormatType = 'bold' | 'italic' | 'underline' | 'inlineCode' | 'link' | 'header' | 'list' | 'numberedlist' | 'checklist' | 'quote' | 'table' | 'image' | 'marker';

interface EditorToolbarProps {
  onFormat: (format: FormatType, data?: any) => void;
  isFormatActive: (format: FormatType) => boolean;
  disabled?: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ onFormat, isFormatActive, disabled = false }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [headerAnchorEl, setHeaderAnchorEl] = React.useState<null | HTMLElement>(null);
  const [alignAnchorEl, setAlignAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, type: 'more' | 'header' | 'align') => {
    switch (type) {
      case 'more':
        setAnchorEl(event.currentTarget);
        break;
      case 'header':
        setHeaderAnchorEl(event.currentTarget);
        break;
      case 'align':
        setAlignAnchorEl(event.currentTarget);
        break;
    }
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setHeaderAnchorEl(null);
    setAlignAnchorEl(null);
  };

  const handleHeaderSelect = (level: number) => {
    onFormat('header', { level });
    handleMenuClose();
  };

  const handleAlignSelect = (align: string) => {
    // Handle alignment if needed
    handleMenuClose();
  };

  const renderFormatButton = (format: FormatType, icon: React.ReactNode, tooltip: string) => (
    <Tooltip title={tooltip} arrow>
      <ToggleButton
        value={format}
        selected={isFormatActive(format)}
        disabled={disabled}
        onMouseDown={(e) => {
          e.preventDefault();
          onFormat(format);
        }}
        sx={{
          '&.Mui-selected': {
            backgroundColor: 'action.selected',
            '&:hover': {
              backgroundColor: 'action.selected',
            },
          },
        }}
      >
        {icon}
      </ToggleButton>
    </Tooltip>
  );

  return (
    <Box
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        p: 0.5,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.5,
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      }}
    >
      <ToggleButtonGroup size="small" sx={{ flexShrink: 0 }}>
        {renderFormatButton('bold', <FormatBold fontSize="small" />, 'Bold (Ctrl+B)')}
        {renderFormatButton('italic', <FormatItalic fontSize="small" />, 'Italic (Ctrl+I)')}
        {renderFormatButton('underline', <FormatUnderlined fontSize="small" />, 'Underline (Ctrl+U)')}
        {renderFormatButton('marker', <Highlight fontSize="small" />, 'Highlight (Ctrl+Shift+H)')}
        {renderFormatButton('inlineCode', <Code fontSize="small" />, 'Inline Code (Ctrl+`)')}
      </ToggleButtonGroup>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <ToggleButtonGroup size="small" sx={{ flexShrink: 0 }}>
        <Tooltip title="Heading" arrow>
          <IconButton size="small" onClick={(e) => handleMenuOpen(e, 'header')} disabled={disabled}>
            <Title fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Align" arrow>
          <IconButton size="small" onClick={(e) => handleMenuOpen(e, 'align')} disabled={disabled}>
            <FormatAlignLeft fontSize="small" />
          </IconButton>
        </Tooltip>
      </ToggleButtonGroup>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <ToggleButtonGroup size="small" sx={{ flexShrink: 0 }}>
        {renderFormatButton('list', <FormatListBulleted fontSize="small" />, 'Bulleted List')}
        {renderFormatButton('numberedlist', <FormatListNumbered fontSize="small" />, 'Numbered List')}
        {renderFormatButton('checklist', <CheckBox fontSize="small" />, 'Checklist')}
      </ToggleButtonGroup>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <ToggleButtonGroup size="small" sx={{ flexShrink: 0 }}>
        {renderFormatButton('quote', <FormatQuote fontSize="small" />, 'Quote')}
        {renderFormatButton('table', <TableChart fontSize="small" />, 'Insert Table')}
        {renderFormatButton('image', <Image fontSize="small" />, 'Insert Image')}
        {renderFormatButton('link', <Link fontSize="small" />, 'Insert Link')}
      </ToggleButtonGroup>

      <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <Tooltip title="More options" arrow>
          <IconButton size="small" onClick={(e) => handleMenuOpen(e, 'more')} disabled={disabled}>
            <MoreVert fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Menu anchorEl={headerAnchorEl} open={Boolean(headerAnchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => handleHeaderSelect(1)}>
          <ListItemText>Heading 1</ListItemText>
          <ListItemText sx={{ textAlign: 'right', color: 'text.secondary' }}>#</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleHeaderSelect(2)}>
          <ListItemText>Heading 2</ListItemText>
          <ListItemText sx={{ textAlign: 'right', color: 'text.secondary' }}>##</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleHeaderSelect(3)}>
          <ListItemText>Heading 3</ListItemText>
          <ListItemText sx={{ textAlign: 'right', color: 'text.secondary' }}>###</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleHeaderSelect(4)}>
          <ListItemText>Heading 4</ListItemText>
          <ListItemText sx={{ textAlign: 'right', color: 'text.secondary' }}>####</ListItemText>
        </MenuItem>
      </Menu>

      <Menu anchorEl={alignAnchorEl} open={Boolean(alignAnchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => handleAlignSelect('left')}>
          <ListItemIcon>
            <FormatAlignLeft fontSize="small" />
          </ListItemIcon>
          <ListItemText>Align Left</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAlignSelect('center')}>
          <ListItemIcon>
            <FormatAlignCenter fontSize="small" />
          </ListItemIcon>
          <ListItemText>Center</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAlignSelect('right')}>
          <ListItemIcon>
            <FormatAlignRight fontSize="small" />
          </ListItemIcon>
          <ListItemText>Align Right</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAlignSelect('justify')}>
          <ListItemIcon>
            <FormatAlignJustify fontSize="small" />
          </ListItemIcon>
          <ListItemText>Justify</ListItemText>
        </MenuItem>
      </Menu>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            onFormat('table');
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <TableChart fontSize="small" />
          </ListItemIcon>
          <ListItemText>Table</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            onFormat('image');
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <Image fontSize="small" />
          </ListItemIcon>
          <ListItemText>Image</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            onFormat('link');
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <Link fontSize="small" />
          </ListItemIcon>
          <ListItemText>Link</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default EditorToolbar;