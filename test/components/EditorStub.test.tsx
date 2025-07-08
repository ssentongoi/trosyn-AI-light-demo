import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

// Mock Editor.js
vi.mock('@editorjs/editorjs', () => ({
  __esModule: true,
  default: vi.fn().mockImplementation(() => ({
    isReady: Promise.resolve(),
    render: vi.fn(),
    destroy: vi.fn(),
    save: vi.fn().mockResolvedValue({}),
  })),
}));

// Create a simplified Editor stub to test
const EditorStub: React.FC<{ onChange?: (data: any) => void; readOnly?: boolean }> = ({ 
  onChange, 
  readOnly = false 
}) => {
  return (
    <div 
      data-testid="editor-stub"
      data-readonly={readOnly.toString()}
    >
      Editor Stub
    </div>
  );
};

describe('EditorStub', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <EditorStub onChange={() => {}} />
    );
    
    const editorElement = screen.getByTestId('editor-stub');
    expect(editorElement).toBeInTheDocument();
  });

  it('handles read-only mode', () => {
    render(
      <EditorStub onChange={() => {}} readOnly={true} />
    );
    
    const editorElement = screen.getByTestId('editor-stub');
    expect(editorElement).toHaveAttribute('data-readonly', 'true');
  });
});
