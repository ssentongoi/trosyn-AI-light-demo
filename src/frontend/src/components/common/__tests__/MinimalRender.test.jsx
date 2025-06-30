import React from 'react';
import { render, screen } from '../../../test-utils';

test('renders simple div', () => {
  render(<div data-testid="simple">Hello</div>);
  expect(screen.getByTestId('simple')).toBeInTheDocument();
});
