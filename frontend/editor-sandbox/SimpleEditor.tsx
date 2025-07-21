import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState, useMemo } from 'react';
import EditorJS, { OutputData } from '@editorjs/editorjs';
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

export interface EditorInstance {
  save: () => Promise<OutputData>;
  clear: () => void;
  isReady: boolean;
}

interface SimpleEditorProps {
  placeholder?: string;
  onSave?: (data: OutputData) => void;
  onChange?: (data: OutputData) => void;
}

const SimpleEditor = forwardRef<EditorInstance, SimpleEditorProps>(({ placeholder, onSave, onChange }, ref) => {
  const editorRef = useRef<EditorJS | null>(null);
  const holderId = useMemo(() => `editor-${Math.random().toString(36).substr(2, 9)}`, []);
  const [isReady, setIsReady] = useState(false);

  useImperativeHandle(ref, () => ({
    save: async () => {
      if (!editorRef.current) {
        throw new Error('Editor is not initialized.');
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
    isReady,
  }));

  useEffect(() => {
    if (!editorRef.current) {
      const editor = new EditorJS({
        holder: holderId,
        placeholder: placeholder || "What's on your mind?",
        autofocus: true,
        minHeight: 0,
        tools: {
          header: {
            class: Header,
            inlineToolbar: ['bold', 'italic', 'underline', 'link', 'marker'],
            config: {
              placeholder: 'Heading',
              levels: [1, 2, 3],
              defaultLevel: 2,
            },
          },
          paragraph: {
            class: Paragraph,
            inlineToolbar: ['bold', 'italic', 'underline', 'link', 'marker'],
            config: {
              placeholder: "Start writing..."
            }
          },
          list: {
            class: List,
            inlineToolbar: ['bold', 'italic', 'underline', 'link', 'marker'],
            config: {
              defaultStyle: 'unordered',
            }
          },
          checklist: {
            class: Checklist,
            inlineToolbar: true,
          },
          quote: {
            class: Quote,
            inlineToolbar: ['bold', 'italic', 'underline', 'link', 'marker'],
          },
          code: {
            class: Code,
            inlineToolbar: true,
          },
          delimiter: Delimiter,
          table: {
            class: Table,
            inlineToolbar: true,
          },
          marker: {
            class: Marker,
            shortcut: 'CMD+SHIFT+M',
          },
          underline: {
            class: Underline,
          },
          link: {
            class: LinkTool,
            config: {
              endpoint: '', // Optionally set a backend endpoint for link metadata
            },
          },
        },
        onReady: () => {
          setIsReady(true);
        },
        onChange: async () => {
          if (onChange) {
            try {
              const data = await editor.save();
              onChange(data);
            } catch (e) {
              console.error("Error on editor change:", e);
            }
          }
        },
      });
      editorRef.current = editor;
    }

    return () => {
      if (editorRef.current && typeof editorRef.current.destroy === 'function') {
        editorRef.current.destroy();
        editorRef.current = null;
        setIsReady(false);
      }
    };
  }, [holderId, onChange, placeholder]);

  return <div id={holderId} style={{ width: '100%', minHeight: '150px' }} />;
});

export default SimpleEditor;
