import React, { useRef, useCallback } from 'react';
import ThemeWrapper from './components/ThemeWrapper';
import SimpleEditor, { EditorInstance } from './SimpleEditor';

const EditorSandbox: React.FC = () => {
  const editorRef = useRef<EditorInstance>(null);

  const handleSave = useCallback(async () => {
    if (editorRef.current) {
      try {
        const data = await editorRef.current.save();
        console.log('Editor content saved:', data);
      } catch (error) {
        console.error('Error saving editor content:', error);
      }
    }
  }, []);

  const handleChange = useCallback((data: any) => {
    console.log('Editor content changed:', data);
  }, []);

  return (
    <ThemeWrapper initialTheme="dark">
      <div className="p-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 dark:text-white">Editor.js Sandbox</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <SimpleEditor
            ref={editorRef}
            onSave={handleSave}
            onChange={handleChange}
            placeholder="Start writing here..."
          />
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Save
          </button>
        </div>
      </div>
    </ThemeWrapper>
  );
};

export default EditorSandbox;
