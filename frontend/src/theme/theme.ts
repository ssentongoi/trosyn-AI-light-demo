import { createTheme } from '@mui/material/styles';

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
    },
  },
  spacing: 8, // 8px base unit
  shape: {
    borderRadius: 4,
  },
});

// Export the theme
export default theme;

// Export tokens for the editor
type ColorMode = 'light' | 'dark';

export const tokens = (mode: ColorMode = 'light') => ({
  colors: {
    primary: mode === 'dark' ? '#90caf9' : theme.palette.primary.main,
    secondary: mode === 'dark' ? '#f48fb1' : theme.palette.secondary.main,
    background: mode === 'dark' ? '#121212' : theme.palette.background.default,
    paper: mode === 'dark' ? '#1e1e1e' : theme.palette.background.paper,
    text: {
      primary: mode === 'dark' ? 'rgba(255, 255, 255, 0.87)' : 'rgba(0, 0, 0, 0.87)',
      secondary: mode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
      disabled: mode === 'dark' ? 'rgba(255, 255, 255, 0.38)' : 'rgba(0, 0, 0, 0.38)',
    },
  },
  typography: {
    fontFamily: theme.typography.fontFamily,
    fontSize: {
      small: '0.875rem',
      medium: '1rem',
      large: '1.25rem',
    },
  },
  spacing: (multiplier = 1) => `${theme.spacing(multiplier)}`,
  shadows: theme.shadows,
  shape: {
    borderRadius: theme.shape.borderRadius,
  },
});
