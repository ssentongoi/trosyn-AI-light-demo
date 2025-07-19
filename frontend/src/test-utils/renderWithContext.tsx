import { render, RenderOptions } from '@testing-library/react';
import React, { ReactElement } from 'react';
import { TestWrapper, TestWrapperProps } from './TestWrapper';

type CustomRenderOptions = Omit<TestWrapperProps, 'children'> & RenderOptions;

export const renderWithContext = (
  ui: ReactElement,
  { wsContext, appContextProps, ...renderOptions }: CustomRenderOptions = {}
) => {
  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <TestWrapper wsContext={wsContext} appContextProps={appContextProps}>
      {children}
    </TestWrapper>
  );

  return {
    ...render(ui, { wrapper, ...renderOptions }),
    // Add any additional utilities here
  };
};

// Re-export everything from testing-library
// This allows using renderWithContext as a drop-in replacement for render
export * from '@testing-library/react';
// Override the render export with our custom render
export { renderWithContext as render };
