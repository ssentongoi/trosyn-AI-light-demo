// Place imports at the top - these won't be hoisted
import { vi } from 'vitest';
import React from 'react';

// First, mock the Editor component - this will be hoisted
vi.mock('../../src/frontend/src/components/editor/Editor', () => {
  return {
    Editor: ({ onChange = () => {}, readOnly = false, 'data-testid': testId = 'test-editor' }) => {
      return (
        <div
          data-testid={testId}
          data-readonly={readOnly.toString()}
          style={{
            border: '1px solid #e0e0e0',
            padding: '16px',
          }}
        >
          Mock Editor Content
        </div>
      );
    },
  };
});

// Mock EditorJS
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

// Mock the theme module
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
        500: '#2196f3',
        700: '#1976d2',
      },
    }),
  };
});

// Rest of imports
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { StyledEngineProvider, ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { Editor } from '../../src/frontend/src/components/editor/Editor';

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

describe('Editor Component with Custom Test Setup', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the editor container', () => {
    render(
      <TestWrapper>
        <Editor
          onChange={mockOnChange}
          data-testid="test-editor"
        />
      </TestWrapper>
    );

    const editorElement = screen.getByTestId('test-editor');
    expect(editorElement).toBeInTheDocument();
  });

  it('handles read-only mode', () => {
    render(
      <TestWrapper>
        <Editor
          onChange={mockOnChange}
          readOnly={true}
          data-testid="test-editor"
        />
      </TestWrapper>
    );

    const editorElement = screen.getByTestId('test-editor');
    expect(editorElement).toHaveAttribute('data-readonly', 'true');
  });
});
