import React, { useEffect, useRef, useCallback } from 'react';
import EditorJS, { 
  OutputData, 
  API, 
  LogLevels,
  EditorConfig as EditorJSEditorConfig,
  ToolSettings
} from '@editorjs/editorjs';

/**
 * Environment Configuration
 * 
 * This section handles environment-specific configuration for the editor.
 * It provides fallbacks for when running in different environments.
 */

declare global {
  interface Window {
    env?: {
      IS_DEVELOPMENT: boolean;
      IS_BROWSER: boolean;
      IS_APP: boolean;
      IS_PRODUCTION: boolean;
    };
  }
}

// Get environment variables with fallbacks
const ENV = window.env || {
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_BROWSER: true, // Default to browser mode if not specified
  IS_APP: false,
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
};

// Destructure environment variables for easier access
const { IS_DEVELOPMENT } = ENV;

/**
 * EditorJS Configuration
 * 
 * Extends the default EditorJS configuration with our custom options
 * and type definitions for better TypeScript support.
 */
interface EditorJSConfig extends Omit<EditorJSEditorConfig, 'logLevel' | 'onReady' | 'onChange'> {
  /** Logging level for the editor */
  logLevel?: LogLevels;
  
  /** Whether the editor is in read-only mode */
  readOnly?: boolean;
  
  /** Callback when the editor is ready */
  onReady?: () => void;
  
  /** Callback when editor content changes */
  onChange?: (api: API) => void;
  
  // Add any other custom properties here
  [key: string]: any;
}

/**
 * Enhanced EditorJS Instance
 * 
 * We use a type assertion to extend the EditorJS instance with our custom properties.
 * This is safer than interface extension which can cause conflicts with internal types.
 */
type EditorJSEnhanced = EditorJS & {
  /** Read-only mode controller */
  readOnly: {
    toggle: (readOnly: boolean) => void;
    isEnabled: boolean;
  };
};

/**
 * EditorComponent Props
 * 
 * Defines the properties that can be passed to the EditorComponent.
 */
interface EditorComponentProps {
  /** 
   * Initial editor data to be loaded into the editor
   * @default undefined
   */
  data?: OutputData;
  
  /** 
   * Callback function that is called when the editor content changes
   * @param data - The current editor content
   */
  onChange?: (data: OutputData) => void;
  
  /** 
   * Placeholder text to show when the editor is empty
   * @default 'Start writing here...'
   */
  placeholder?: string;
  
  /** 
   * Whether the editor is in read-only mode
   * @default false
   */
  readOnly?: boolean;
  
  /** 
   * Minimum height of the editor in pixels or as a CSS string
   * @default '200px'
   */
  minHeight?: number | string;
  
  /** 
   * Custom editor tools configuration
   * @default {}
   */
  tools?: Record<string, any>;
  
  /** 
   * Callback function that is called when the editor is fully initialized
   */
  onReady?: () => void;
  
  /** 
   * Callback function that is called when an error occurs
   * @param error - The error that occurred
   */
  onError?: (error: Error) => void;
}

/**
 * EditorComponent
 * 
 * A rich text editor component built on top of EditorJS.
 * Provides a clean interface for editing and managing rich text content.
 * 
 * @component
 * @example
 * ```tsx
 * <EditorComponent
 *   data={initialData}
 *   onChange={handleChange}
 *   placeholder="Start writing your content..."
 *   readOnly={false}
 *   minHeight="300px"
 *   onReady={handleEditorReady}
 *   onError={handleEditorError}
 * />
 * ```
 */
const EditorComponent: React.FC<EditorComponentProps> = ({
  data,
  onChange,
  placeholder = 'Start writing here...',
  readOnly = false,
  minHeight = '200px',
  tools = {},
  onReady,
  onError = (error) => {
    // Only log errors in development mode
    if (IS_DEVELOPMENT) {
      console.error('Editor error:', error);
    }
  },
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstance = useRef<EditorJSEnhanced | null>(null);
  const isMounted = useRef(true);

  // Handle editor changes
  const handleChange = useCallback(async (api: API) => {
    if (!onChange) return;
    
    try {
      const savedData = await api.saver.save();
      if (isMounted.current) {
        onChange(savedData);
      }
    } catch (error) {
      if (isMounted.current) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }, [onChange, onError]);

  // Initialize editor
  useEffect(() => {
    if (!editorRef.current) return;
    
    isMounted.current = true;
    let isInitialized = false;

    const initEditor = async () => {
      try {
        // Dynamic import to enable code-splitting
        const EditorJS = (await import('@editorjs/editorjs')).default;
        
        // Only initialize if component is still mounted and not already initialized
        if (!isMounted.current || isInitialized) return;
        
        // Create editor configuration with type safety
        const editorConfig: EditorJSConfig = {
          holder: editorRef.current!,
          tools: {
            // Add default tools here or use provided tools
            ...tools,
          },
          data,
          placeholder,
          readOnly,
          minHeight: typeof minHeight === 'number' ? minHeight : 300,
          onChange: handleChange,
          onReady: () => {
            if (isMounted.current) {
              isInitialized = true;
              onReady?.();
            }
          },
          // Set appropriate log level based on environment
          logLevel: IS_DEVELOPMENT ? LogLevels.WARN : LogLevels.ERROR,
        };
        
        // Create editor instance
        const editor = new EditorJS(editorConfig) as EditorJSEnhanced;

        editorInstance.current = editor;
      } catch (error) {
        if (isMounted.current) {
          onError(error instanceof Error ? error : new Error('Failed to initialize editor'));
        }
      }
    };

    initEditor();

    // Cleanup function
    return () => {
      isMounted.current = false;
      
      const cleanup = async () => {
        if (editorInstance.current) {
          try {
            await editorInstance.current.destroy();
            editorInstance.current = null;
          } catch (error) {
            onError(error instanceof Error ? error : new Error('Error during editor cleanup'));
          }
        }
      };

      cleanup();
    };
  }, []); // Empty dependency array means this effect runs once on mount

  // Update editor when data prop changes
  useEffect(() => {
    if (!editorInstance.current || !data) return;

    const updateEditorData = async () => {
      try {
        await editorInstance.current?.isReady;
        if (isMounted.current && editorInstance.current) {
          await editorInstance.current.render(data);
        }
      } catch (error) {
        if (isMounted.current) {
          onError(error instanceof Error ? error : new Error('Error updating editor data'));
        }
      }
    };

    updateEditorData();
  }, [data, onError]);

  // Update readOnly state
  useEffect(() => {
    if (!editorInstance.current) return;

    const updateReadOnly = async () => {
      try {
        await editorInstance.current?.isReady;
        if (isMounted.current && editorInstance.current?.readOnly) {
          editorInstance.current.readOnly.toggle(readOnly);
        }
      } catch (error) {
        if (isMounted.current) {
          onError(error instanceof Error ? error : new Error('Error updating read-only state'));
        }
      }
    };

    updateReadOnly();
  }, [readOnly, onError]);

  // Handle window resize events for better mobile/desktop experience
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      // Add any resize handling if needed
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div 
      className="editor-container"
      ref={editorRef} 
      style={{
        minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight,
        outline: 'none',
        position: 'relative',
      }}
      role="textbox"
      aria-label="Text editor"
      data-testid="editor-container"
      tabIndex={-1}
    />
  );
};

export default EditorComponent;
