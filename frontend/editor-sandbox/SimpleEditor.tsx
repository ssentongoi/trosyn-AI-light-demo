import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
  useMemo,
  useCallback,
  CSSProperties
} from 'react';
import EditorJS, {
  OutputData,
  BlockToolConstructable,
  InlineToolConstructable,
  EditorConfig,
  BlockAPI,
  BlockToolData,
  API
} from '@editorjs/editorjs';

// Extended BlockAPI type that includes the data property
type ExtendedBlockAPI = BlockAPI & {
  data: BlockToolData & {
    text?: string;
    [key: string]: any;
  };
};

// Type guard to check if block has data property
function isExtendedBlock(block: BlockAPI): block is ExtendedBlockAPI {
  return 'data' in block && block.data !== undefined;
}

// Import Editor.js tools
import Header from '@editorjs/header';
import Paragraph from '@editorjs/paragraph';
import List from '@editorjs/list';
import Checklist from '@editorjs/checklist';
import Quote from '@editorjs/quote';
import Code from '@editorjs/code';
import Delimiter from '@editorjs/delimiter';
import Table from '@editorjs/table';
import Marker from '@editorjs/marker';
import Underline from '@editorjs/underline';
import LinkTool from '@editorjs/link';

// Import components
import { useTheme } from './context/ThemeContext';

// Type for editor actions
type EditorAction =
  | 'bold' | 'italic' | 'underline' | 'strikethrough' | 'link' | 'code' | 'equation'
  | 'h1' | 'h2' | 'h3' | 'ul' | 'ol' | 'todo' | 'quote' | 'codeblock';

export interface EditorInstance {
  save: () => Promise<OutputData>;
  clear: () => void;
  render: (data: OutputData) => Promise<void>;
  insertBlock: (type: string, data: any) => void;
  focus: () => void;
  destroy: () => Promise<void>;
  isReady: boolean;
  getSelectedText: () => string;
}

interface SimpleEditorProps {
  holder: string;
  initialData?: any;
  placeholder?: string;
  onChange?: (data: OutputData) => void;
  onSave?: (data: OutputData) => void;
  onReady?: () => void;
  onSelectionChange?: (isSelected: boolean) => void;
  readOnly?: boolean;
  autofocus?: boolean;
  minHeight?: number;
}

const EditorComponent = forwardRef<EditorInstance, SimpleEditorProps>(({
  holder,
  initialData,
  placeholder = 'Type something...',
  onSave,
  onChange,
  onReady,
  onSelectionChange,
  readOnly = false,
  autofocus = true,
  minHeight = 150,
}, ref) => {
  const editorRef = useRef<EditorJS | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const isMounted = useRef(true);
    const { theme } = useTheme();

      const handleSelection = useCallback(() => {
    if (onSelectionChange) {
      const selection = window.getSelection();
      const isSelected = !!selection && selection.toString().length > 0;
      onSelectionChange(isSelected);
    }
  }, [onSelectionChange]);

  // Cleanup function
  const cleanup = useCallback(async () => {
    const editor = editorRef.current;
    // Check if the instance and its destroy method exist
    if (editor && typeof editor.destroy === 'function') {
      try {
        // Nullify the ref immediately to prevent race conditions
        editorRef.current = null;

        if (onSave) {
          const data = await editor.save();
          onSave(data);
        }
        await editor.destroy();
      } catch (error) {
        console.error('Error during editor cleanup:', error);
      }
    }
  }, [onSave]);

  // Expose editor methods via ref
      useImperativeHandle(ref, () => ({
    getSelectedText: () => {
      const selection = window.getSelection();
      return selection ? selection.toString() : '';
    },
    save: async () => {
      if (!editorRef.current) {
        throw new Error('Editor is not initialized');
      }
      const savedData = await editorRef.current.save();
      if (onSave) {
        onSave(savedData);
      }
      return savedData;
    },
    clear: () => {
      editorRef.current?.clear();
    },
    render: (data: OutputData) => {
      if (!editorRef.current) {
        throw new Error('Editor is not initialized');
      }
      return editorRef.current.render(data);
    },
    insertBlock: (type: string, data: any) => {
      if (!editorRef.current) {
        throw new Error('Editor is not initialized');
      }
      const index = editorRef.current.blocks.getCurrentBlockIndex();
      editorRef.current.blocks.insert(type, data, {}, index + 1, true);
    },
    focus: () => {
      editorRef.current?.focus();
    },
    destroy: cleanup,
    isReady,
  }), [isReady, onSave, cleanup]);

  // Initialize Editor.js
  useEffect(() => {
    if (editorRef.current || !isMounted.current) return;

    const initEditor = async () => {
      try {
        const editorConfig: EditorConfig = {
          holder: holder,
          placeholder,
          autofocus,
          minHeight,
          readOnly,
          data: initialData,
                onReady: () => {
        const editorHolder = editorContainerRef.current;
        if (editorHolder) {
          editorHolder.addEventListener('mouseup', handleSelection);
          editorHolder.addEventListener('keyup', handleSelection);
        }

            if (!isMounted.current) return;
            setIsReady(true);
            onReady?.();
          },
          onChange: async () => {
            if (!isMounted.current || !onChange || !editorRef.current) return;
            try {
              const data = await editorRef.current.save();
              onChange(data);
            } catch (error) {
              console.error('Error handling editor change:', error);
            }
          },
          tools: {
            header: {
              class: Header as unknown as BlockToolConstructable,
              inlineToolbar: ['bold', 'italic', 'underline', 'link', 'marker'],
              config: {
                placeholder: 'Heading',
                levels: [1, 2, 3],
                defaultLevel: 2,
              },
            },
            paragraph: {
              class: Paragraph as unknown as BlockToolConstructable,
              inlineToolbar: ['bold', 'italic', 'underline', 'link', 'marker'],
              config: {
                placeholder: placeholder || 'Let\'s write an awesome story!',
              },
            },
            list: {
              class: List as unknown as BlockToolConstructable,
              inlineToolbar: ['bold', 'italic', 'underline', 'link', 'marker'],
              config: {
                defaultStyle: 'unordered',
              },
            },
            checklist: {
              class: Checklist as unknown as BlockToolConstructable,
              inlineToolbar: true,
            },
            quote: {
              class: Quote as unknown as BlockToolConstructable,
              inlineToolbar: ['bold', 'italic', 'underline', 'link', 'marker'],
            },
            code: {
              class: Code as unknown as BlockToolConstructable,
              inlineToolbar: true,
            },
            delimiter: Delimiter as unknown as BlockToolConstructable,
            table: {
              class: Table as unknown as BlockToolConstructable,
              inlineToolbar: true,
            },
            marker: {
              class: Marker as unknown as InlineToolConstructable,
              shortcut: 'CMD+SHIFT+M',
            },
            underline: {
              class: Underline as unknown as InlineToolConstructable,
            },
            linkTool: {
              class: LinkTool as unknown as BlockToolConstructable,
              config: {
                endpoint: '', // Optionally set a backend endpoint for link metadata
              },
            },
          },
        };

        editorRef.current = new EditorJS(editorConfig);
      } catch (error) {
        console.error('Error initializing Editor.js:', error);
      }
    };

    initEditor();

    return () => {
      const editorHolder = editorContainerRef.current;
      if (editorHolder) {
        editorHolder.removeEventListener('mouseup', handleSelection);
        editorHolder.removeEventListener('keyup', handleSelection);
      }

      if (isMounted.current) {
        cleanup();
        isMounted.current = false;
      }
    };
  }, [holder, placeholder, autofocus, minHeight, readOnly, initialData, onReady, onChange, cleanup]);

  // Handle prop changes
  useEffect(() => {
    if (editorRef.current && isReady) {
      editorRef.current.readOnly.toggle(readOnly);
    }
  }, [readOnly, isReady]);

  // Calculate editor container styles
  const editorStyles: CSSProperties = useMemo(() => ({
    width: '100%',
    minHeight: `${minHeight}px`,
    position: 'relative',
  }), [minHeight]);

  return (
    <div 
      ref={editorContainerRef} 
      className="editor-container"
      style={editorStyles}
    >
      <div 
        id={holder} 
        style={editorStyles} 
      />
    </div>
  );
});

EditorComponent.displayName = 'EditorComponent';

const SimpleEditor = forwardRef<EditorInstance, SimpleEditorProps>(({
  holder,
  initialData,
  placeholder,
  onChange,
  onSave,
  onReady,
  readOnly,
  autofocus,
  minHeight,
}, ref) => {
  return <EditorComponent 
    holder={holder} 
    initialData={initialData} 
    placeholder={placeholder} 
    onChange={onChange} 
    onSave={onSave} 
    onReady={onReady} 
    readOnly={readOnly} 
    autofocus={autofocus} 
    minHeight={minHeight} 
    ref={ref} 
  />;
});

SimpleEditor.displayName = 'SimpleEditor';

export default SimpleEditor;
