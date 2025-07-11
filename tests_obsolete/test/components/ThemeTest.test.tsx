import React from 'react';
import { render, screen } from '../test-utils';
import { useTheme, ThemeProvider, createTheme } from '@mui/material/styles';
import { vi, describe, it, expect } from 'vitest';

// Simple component that uses the theme
const ThemeConsumer = () => {
  const theme = useTheme();
  return <div data-testid="theme-test">{theme.palette.primary.main}</div>;
};

describe('Theme Test', () => {
  it('should have access to the theme', () => {
    // Render with a simple theme
    render(
      <ThemeProvider theme={createTheme({ palette: { primary: { main: '#1976d2' } } })}>
        <ThemeConsumer />
      </ThemeProvider>
    );

    // Check if the theme value is rendered
    expect(screen.getByTestId('theme-test')).toHaveTextContent('#1976d2');
  });
});
