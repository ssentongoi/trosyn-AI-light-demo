/**
 * Mock theme module for testing
 * This file provides mock values for the theme and tokens used in components
 */

// Define color token palettes
const greyPalette = {
  50: '#fafafa',
  100: '#f5f5f5',
  200: '#eeeeee',
  300: '#e0e0e0', // This is the one causing issues in tests
  400: '#bdbdbd',
  500: '#9e9e9e',
  600: '#757575',
  700: '#616161',
  800: '#424242',
  900: '#212121',
};

const bluePalette = {
  50: '#e3f2fd',
  100: '#bbdefb',
  200: '#90caf9',
  300: '#64b5f6',
  400: '#42a5f5',
  500: '#2196f3',
  600: '#1e88e5',
  700: '#1976d2',
  800: '#1565c0',
  900: '#0d47a1',
};

const greenPalette = {
  50: '#e8f5e9',
  100: '#c8e6c9',
  200: '#a5d6a7',
  300: '#81c784',
  400: '#66bb6a',
  500: '#4caf50',
  600: '#43a047',
  700: '#388e3c',
  800: '#2e7d32',
  900: '#1b5e20',
};

const redPalette = {
  50: '#ffebee',
  100: '#ffcdd2',
  200: '#ef9a9a',
  300: '#e57373',
  400: '#ef5350',
  500: '#f44336',
  600: '#e53935',
  700: '#d32f2f',
  800: '#c62828',
  900: '#b71c1c',
};

// Create tokens object with both function and direct property access
const tokens = (mode: string) => {
  const result = {
    grey: greyPalette,
    blue: bluePalette,
    green: greenPalette,
    red: redPalette,
    // Add any other token categories used in your app
  };
  
  return result;
};

// Add direct properties to the function for direct access
tokens.grey = greyPalette;
tokens.blue = bluePalette;
tokens.green = greenPalette;
tokens.red = redPalette;

export { tokens };

// Create a default theme object that matches your app's theme structure
const theme = {
  palette: {
    mode: 'light',
    primary: {
      main: bluePalette[700],
    },
    secondary: {
      main: greenPalette[500],
    },
    error: {
      main: redPalette[500],
    },
    grey: greyPalette,
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: greyPalette[900],
      secondary: greyPalette[700],
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
  },
  shape: {
    borderRadius: 4,
  },
  spacing: (factor: number) => `${8 * factor}px`,
};

// Export both tokens and the default theme
export default theme;
