import React, { useEffect, useRef } from 'react';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';

const EditorComponent = () => {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current) {
      const editor = new EditorJS({
        holder: editorRef.current,
        tools: {
          header: Header,
          list: List,
        },
      });

      return () => {
        editor.destroy();
      };
    }
  }, []);

  return <div ref={editorRef} />;
};

export default EditorComponent;
