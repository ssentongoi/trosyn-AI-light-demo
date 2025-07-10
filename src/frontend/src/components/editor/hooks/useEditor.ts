
import React, { useState, useRef, useCallback, useEffect } from 'react';
import EditorJS, { OutputData } from '@editorjs/editorjs';
import { useEditorDocument } from '../../../hooks/useEditorDocument';
import {
  Header,
  List,
  NestedList,
  Table,
  Checklist,
  CodeTool,
  InlineCode,
  Marker,
  Underline,
  LinkTool,
  ImageTool,
  Quote,
  Warning,
  Delimiter,
  Embed,
} from './editorTools';

export interface UseEditorProps {
  documentId?: string;
  initialContent?: OutputData;
  readOnly?: boolean;
  placeholder?: string;
  autosave?: boolean;
  onSave?: (document: any) => void;
}

const DEFAULT_INITIAL_DATA = {
  time: new Date().getTime(),
  blocks: [
    {
      type: 'header',
      data: {
        text: 'Start writing here...',
        level: 2,
      },
    },
  ],
};

export const useEditor = ({
  documentId,
  initialContent,
  readOnly = false,
  placeholder = 'Type here...',
  autosave = true,
  onSave,
}: UseEditorProps) => {
  const { document: doc, saveDocument, isSaving } = useEditorDocument(documentId);
  const editorRef = useRef<EditorJS | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  // Check if a format is active
  const isFormatActive = useCallback((format: string): boolean => {
    if (!editorRef.current) return false;
    return activeFormats.has(format);
  }, [activeFormats]);

  // Handle formatting changes
  const handleFormat = useCallback(async (format: string, data?: unknown) => {
    if (!editorRef.current) return;

    try {
      const { blocks } = await editorRef.current.save();
      const currentBlockIndex = blocks.length - 1;
      const currentBlock = blocks[currentBlockIndex];

      switch (format) {
        case 'bold':
          document.execCommand('bold', false);
          break;
        case 'italic':
          document.execCommand('italic', false);
          break;
        case 'underline':
          document.execCommand('underline', false);
          break;
        case 'inlineCode':
          document.execCommand('formatBlock', false, '<code>');
          break;
        case 'header':
          editorRef.current.blocks.update(currentBlock.id, { 
            type: 'header',
            data: {
              ...currentBlock.data,
              level: data?.level || 2,
              text: currentBlock.data.text || ''
            }
          });
          break;
        // Add other format cases as needed
      }
      
      // Update active formats
      const newFormats = new Set(activeFormats);
      if (document.queryCommandState('bold')) newFormats.add('bold');
      if (document.queryCommandState('italic')) newFormats.add('italic');
      if (document.queryCommandState('underline')) newFormats.add('underline');
      setActiveFormats(newFormats);
      
    } catch (error) {
      console.error('Error applying format:', error);
    }
  }, [activeFormats]);

  const handleSave = useCallback(async () => {
    if (!editorRef.current) {
      throw new Error('Editor not initialized');
    }

    try {
      const savedData = await editorRef.current.save();
      const document = {
        id: documentId || `doc-${Date.now()}`,
        title: 'Untitled Document',
        content: savedData,
        createdAt: doc?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const savedDoc = await saveDocument(savedData);

      if (onSave) {
        onSave(savedDoc || document);
      }

      return savedDoc || document;
    } catch (error) {
      console.error('Error saving document:', error);
      throw error;
    }
  }, [documentId, onSave, saveDocument, doc?.createdAt]);

  const initializeEditor = useCallback((editorContainer: HTMLDivElement) => {
    if (!editorRef.current) {
      const editor = new EditorJS({
        holder: editorContainer,
        placeholder,
        readOnly,
        data: doc?.content || initialContent || DEFAULT_INITIAL_DATA,
        onReady: () => {
          setIsEditorReady(true);
        },
        onChange: () => {
          if (autosave) {
            handleSave();
          }
        },
        tools: {
          header: Header,
          list: NestedList,
          table: Table,
          checklist: Checklist,
          code: CodeTool,
          inlineCode: InlineCode,
          marker: Marker,
          underline: Underline,
          link: LinkTool,
          image: ImageTool,
          quote: Quote,
          warning: Warning,
          delimiter: Delimiter,
          embed: Embed,
        },
      });
      editorRef.current = editor;
    }
  }, [doc, initialContent, placeholder, readOnly, autosave, handleSave]);

  useEffect(() => {
    return () => {
      if (editorRef.current && editorRef.current.destroy) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  // Update active formats when selection changes
  useEffect(() => {
    const updateFormats = () => {
      const formats = new Set<string>();
      if (document.queryCommandState('bold')) formats.add('bold');
      if (document.queryCommandState('italic')) formats.add('italic');
      if (document.queryCommandState('underline')) formats.add('underline');
      setActiveFormats(formats);
    };

    document.addEventListener('selectionchange', updateFormats);
    return () => document.removeEventListener('selectionchange', updateFormats);
  }, []);

  return {
    editorRef,
    isEditorReady,
    isSaving,
    doc,
    initializeEditor,
    handleSave,
    handleFormat,
    isFormatActive,
  };
};
