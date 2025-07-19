import { useEffect, useRef } from 'react';
import EditorJS from '@editorjs/editorjs';
// Temporarily removing specific imports to simplify setup

const SimpleEditor = () => {
  const editorRef = useRef<EditorJS | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('SimpleEditor: useEffect running');
    if (!editorContainerRef.current) {
      console.error('SimpleEditor: No container ref available');
      return;
    }

    // Initialize EditorJS with minimal configuration
    console.log('SimpleEditor: Initializing EditorJS');
    try {
      // Create a minimal editor instance
      const editor = new EditorJS({
        holder: editorContainerRef.current,
        placeholder: 'Start writing here...',
        data: {
          blocks: [
            {
              type: 'header',
              data: {
                text: 'Welcome to EditorJS!',
                level: 2
              }
            },
            {
              type: 'paragraph',
              data: {
                text: 'This is a test of the EditorJS component.'
              }
            }
          ]
        },
        onReady: () => {
          console.log('Editor.js is ready to work!');
        },
        onChange: (api, event) => {
          console.log('Editor content changed', { event });
        },
        autofocus: true,
        tools: {
          // Only include basic tools for now
          header: {
            class: require('@editorjs/header'),
            inlineToolbar: true,
            config: {
              placeholder: 'Enter a header',
              levels: [1, 2, 3],
              defaultLevel: 2
            }
          },
          list: {
            class: require('@editorjs/list'),
            inlineToolbar: true
          },
          paragraph: {
            class: require('@editorjs/paragraph'),
            inlineToolbar: true
          }
        }
      });
      
      editorRef.current = editor;
      console.log('SimpleEditor: EditorJS initialized successfully');
      
      return () => {
        console.log('SimpleEditor: Cleaning up EditorJS');
        if (editorRef.current) {
          editorRef.current.destroy();
          editorRef.current = null;
        }
      };
    } catch (error) {
      console.error('SimpleEditor: Error initializing EditorJS:', error);
    }
  }, []);

  return (
    <div className="editor-container" style={{ border: '1px solid #e0e0e0', borderRadius: '4px', padding: '20px' }}>
      <div ref={editorContainerRef} id="editorjs" />
    </div>
  );
};

export default SimpleEditor;
