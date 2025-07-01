import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

test('renders simple div', () => {
  render(<div data-testid="simple">Hello</div>);
  expect(screen.getByTestId('simple')).toBeInTheDocument();
});
