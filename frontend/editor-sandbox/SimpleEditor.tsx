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
import FloatingActionPopup from './components/FloatingActionPopup';
import { useSelectionPopup } from './hooks/useSelectionPopup';
import { useTheme } from './context/ThemeContext';

// Type for editor actions
type EditorAction =
  | 'bold' | 'italic' | 'underline' | 'strikethrough' | 'link' | 'code' | 'equation'
  | 'h1' | 'h2' | 'h3' | 'ul' | 'ol' | 'todo' | 'quote' | 'codeblock';

export interface EditorInstance {
  save: () => Promise<OutputData>;
  clear: () => void;
  isReady: boolean;
  focus: () => void;
  destroy: () => Promise<void>;
}

interface SimpleEditorProps {
  placeholder?: string;
  onSave?: (data: OutputData) => void;
  onChange?: (data: OutputData) => void;
  onReady?: () => void;
  initialData?: OutputData;
  readOnly?: boolean;
  autofocus?: boolean;
  minHeight?: number;
}

const EditorComponent = forwardRef<EditorInstance, SimpleEditorProps>(({
  placeholder = 'Type something...',
  onSave,
  onChange,
  onReady,
  initialData,
  readOnly = false,
  autofocus = true,
  minHeight = 150,
}, ref) => {
  const editorRef = useRef<EditorJS | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const holderId = useMemo(() => `editor-${Math.random().toString(36).substr(2, 9)}`, []);
  const [isReady, setIsReady] = useState(false);
  const isMounted = useRef(true);
  const { theme } = useTheme();

  // Handle editor actions
  const handleAction = useCallback(async (action: string) => {
    if (!editorRef.current) return;

    try {
      if (action.startsWith('format:')) {
        const format = action.split(':')[1] as EditorAction;
        
        // Handle inline formatting
        if (['bold', 'italic', 'underline', 'strikethrough', 'code'].includes(format)) {
          document.execCommand(format, false);
          return;
        }
        
        // Handle block formatting
        if (['h1', 'h2', 'h3', 'ul', 'ol', 'todo', 'quote', 'codeblock'].includes(format)) {
          const blockIndex = await editorRef.current.blocks.getCurrentBlockIndex();
          if (blockIndex !== -1) {
            const currentBlock = await editorRef.current.blocks.getBlockByIndex(blockIndex);
            
            if (currentBlock && isExtendedBlock(currentBlock)) {
              // Type-safe access to block data
              const blockText = currentBlock.data?.text || '';
              const blockType = format === 'codeblock' ? 'code' : format;
              
              await editorRef.current.blocks.update(currentBlock.id, {
                type: blockType,
                data: { text: blockText }
              });
            }
          }
        }
      } else {
        // Handle other actions
        console.log('Action:', action);
        // TODO: Implement action handlers
      }
    } catch (error) {
      console.error('Error handling editor action:', error);
    }
  }, []);

  // Setup selection popup
  const { selection, isVisible, onAction: onPopupAction, onClose } = useSelectionPopup({
    editorRef: editorContainerRef,
    onAction: handleAction,
  });

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
          holder: holderId,
          placeholder,
          autofocus,
          minHeight,
          readOnly,
          data: initialData,
          onReady: () => {
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
                placeholder: 'Start writing...',
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
      isMounted.current = false;
      cleanup();
    };
  }, [holderId, placeholder, autofocus, minHeight, readOnly, initialData, onReady, onChange, cleanup]);

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
        id={holderId} 
        style={editorStyles} 
      />
      {isVisible && selection instanceof Selection && selection.rangeCount > 0 && (
        <FloatingActionPopup
          selection={selection}
          onAction={onPopupAction}
          onClose={onClose}
        />
      )}
    </div>
  );
});

EditorComponent.displayName = 'EditorComponent';

const SimpleEditor = forwardRef<EditorInstance, SimpleEditorProps>((props, ref) => {
  return <EditorComponent {...props} ref={ref} />;
});

SimpleEditor.displayName = 'SimpleEditor';

export default SimpleEditor;
