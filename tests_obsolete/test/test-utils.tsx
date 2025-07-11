import React, { ReactElement, ReactNode, useEffect } from 'react';
import { render, RenderOptions, RenderResult, screen } from '@testing-library/react';
import { ThemeProvider, StyledEngineProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

// This ensures we're using the correct React instance
const ReactDOM = require('react-dom/client');

// Import the theme directly to avoid any module resolution issues
const theme = createTheme({
  // Your theme configuration here
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Helper to ensure we have a root element for React 18+
const createRootElement = () => {
  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
  return root;
};

// Custom render function that handles React 18+ concurrent rendering
const customRender = (
  ui: ReactElement,
  options: Omit<RenderOptions, 'wrapper'> = {}
): RenderResult => {
  // Ensure we have a root element
  let rootElement = document.getElementById('root');
  if (!rootElement) {
    rootElement = createRootElement();
  }

  // Create a wrapper component that includes all providers
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          {children}
        </MemoryRouter>
      </ThemeProvider>
    </StyledEngineProvider>
  );

  // Use baseElement to ensure we render into our test container
  const result = render(ui, {
    wrapper: Wrapper,
    container: rootElement,
    ...options,
  });

  // Add a cleanup function
  result.unmount = () => {
    ReactDOM.unmountComponentAtNode(rootElement);
    return Promise.resolve();
  };

  return result;
};

// Export everything from @testing-library/react
export * from '@testing-library/react';

// Override the render method
export { customRender as render };

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
