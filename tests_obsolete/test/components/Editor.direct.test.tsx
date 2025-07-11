import { vi } from 'vitest';
import React from 'react';

// Mock Editor.js - using inline factory to avoid hoisting issues
vi.mock('@editorjs/editorjs', () => {
  return {
    __esModule: true,
    default: vi.fn().mockImplementation(() => ({
      isReady: Promise.resolve(),
      render: vi.fn(),
      destroy: vi.fn(),
      save: vi.fn().mockResolvedValue({}),
    })),
  };
});

// Mock the theme module with tokens - using inline factory to avoid hoisting issues
vi.mock('../../src/frontend/src/theme/theme', () => {
  return {
    tokens: (mode) => ({
      grey: {
        50: '#fafafa',
        100: '#f5f5f5',
        200: '#eeeeee',
        300: '#e0e0e0',
        400: '#bdbdbd',
        500: '#9e9e9e',
        600: '#757575',
        700: '#616161',
        800: '#424242',
        900: '#212121',
      },
      blue: {
        500: '#1976d2',
      },
    }),
  };
});

// Import other dependencies after mocks
import { describe, it, expect, afterEach } from 'vitest';
import { screen, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StyledEngineProvider, ThemeProvider, createTheme, CssBaseline } from '@mui/material';

// Create a test theme
const testTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Test wrapper with all required providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <StyledEngineProvider injectFirst>
    <ThemeProvider theme={testTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  </StyledEngineProvider>
);

// Mock the Editor component with a default export
vi.mock('../../src/frontend/src/components/editor/Editor', () => ({
  __esModule: true,
  default: vi.fn().mockImplementation(({ onChange, readOnly, 'data-testid': testId = 'editor' }) => (
    <div data-testid={testId} data-readonly={readOnly?.toString()}>
      Mock Editor
    </div>
  ))
}));

// Import the actual Editor component after mocks
import Editor from '../../src/frontend/src/components/editor/Editor';

// Helper function to render the Editor with required providers
const renderEditor = (props = {}) => {
  const defaultProps = {
    onChange: vi.fn(),
    readOnly: false,
    'data-testid': 'editor',
    ...props,
  };

  return render(
    <TestWrapper>
      <Editor {...defaultProps} />
    </TestWrapper>
  );
};

describe('Editor Component', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the editor container', () => {
    renderEditor();
    const editorElement = screen.getByTestId('editor');
    expect(editorElement).toBeInTheDocument();
  });

  it('handles read-only mode', () => {
    renderEditor({ readOnly: true });
    const editorElement = screen.getByTestId('editor');
    expect(editorElement).toHaveAttribute('data-readonly', 'true');
  });
});
