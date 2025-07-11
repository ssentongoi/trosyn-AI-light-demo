import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Editor } from '../../src/frontend/src/components/editor/Editor';
import { vi, describe, it, expect } from 'vitest';

// Mock Editor.js with minimal implementation
vi.mock('@editorjs/editorjs', () => ({
  __esModule: true,
  default: vi.fn().mockImplementation(() => ({
    isReady: Promise.resolve(),
    render: vi.fn(),
    destroy: vi.fn(),
    save: vi.fn().mockResolvedValue({}),
  })),
}));

// Mock the tokens function
vi.mock('../../src/frontend/src/theme/theme', () => {
  // Create a mock for grey color palette
  const mockGrey = {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',  // This is the one used in the component
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121'
  };
  
  // Create the tokens function
  const tokens = (mode: string) => ({
    grey: mockGrey,
    blue: {
      500: '#1976d2'
    }
  });
  
  // Add direct properties to the tokens function for direct access
  tokens.grey = mockGrey;
  
  return {
    tokens,
  };
});

// Create a basic theme for testing
const testTheme = createTheme({
  palette: {
    mode: 'light',
  },
});

// Wrap component with ThemeProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={testTheme}>
    {children}
  </ThemeProvider>
);

describe('Minimal Editor Test', () => {
  it('renders without crashing', () => {
    // Render with minimal required props and ThemeProvider
    const { container } = render(
      <TestWrapper>
        <div id="root">
          <Editor 
            onChange={() => {}} 
            data-testid="editor" 
          />
        </div>
      </TestWrapper>
    );
    
    // Basic assertion that the container is in the document
    expect(container).toBeInTheDocument();
  });
});
