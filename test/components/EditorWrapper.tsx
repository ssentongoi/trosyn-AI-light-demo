import React from 'react';
import { Box, SxProps, Theme } from '@mui/material';
import tokens from '../__mocks__/theme-tokens';
import Editor from '../../src/frontend/src/components/editor/Editor';

/**
 * A wrapper component for Editor that ensures token access works in tests
 * This component passes all props to the original Editor but ensures
 * the component has access to the mocked tokens
 */
interface EditorWrapperProps {
  value?: any;
  onChange?: (data: any) => void;
  readOnly?: boolean;
  placeholder?: string;
  sx?: SxProps<Theme>;
  'data-testid'?: string;
}

const EditorWrapper: React.FC<EditorWrapperProps> = (props) => {
  // Make tokens available in component scope
  React.useEffect(() => {
    // Ensure tokens are available globally
    (window as any).tokens = tokens;
  }, []);

  return <Editor {...props} />;
};

export default EditorWrapper;
