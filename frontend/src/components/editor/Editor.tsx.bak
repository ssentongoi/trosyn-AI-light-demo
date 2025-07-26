import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import type { OutputData, API } from '@editorjs/editorjs';
import EditorJS from '@editorjs/editorjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Dynamically load the minimal set of EditorJS tools we need. Keeping this
 * small avoids complex union typings that have caused TS errors in the past.
 */
const loadTools = async () => {
  const Header = (await import('@editorjs/header')).default;
  const List = (await import('@editorjs/list')).default;
  const Paragraph = (await import('@editorjs/paragraph')).default;

  return {
    header: Header,
    list: List,
    paragraph: Paragraph,
  } as const;
};

export interface EditorInstance {
  /** Save the current document */
  save(): Promise<OutputData>;
  /** Destroy the underlying EditorJS instance */
  destroy(): Promise<void>;
  /** Render a new document */
  render(data: OutputData): Promise<void>;
  /** Focus the editor */
  focus(): void;
  /** Whether the editor is ready */
  isReady: boolean;
  /** Access to raw EditorJS instance (may be null before ready) */
  getEditor(): EditorJS | null;
}

export interface EditorProps {
  initialData?: OutputData;
  /** Callback on every debounced change */
  onChange?: (data: OutputData) => void | Promise<void>;
  /** Manual save callback, triggered by optional Save button */
  onSave?: (data: OutputData) => void | Promise<void>;
  /** Additional CSS class name */
  className?: string;
  readOnly?: boolean;
  autofocus?: boolean;
  placeholder?: string;
  /** Provide a custom holder id if you need deterministic DOM ids */
  holder?: string;
  /** Show a Save button (calls onSave) */
  showSaveButton?: boolean;
}

const DEFAULT_DATA: OutputData = { time: Date.now(), blocks: [] };

const Editor = forwardRef<EditorInstance, EditorProps>(
  (
    {
      initialData = DEFAULT_DATA,
      onChange,
      onSave,
      readOnly = false,
      autofocus = false,
      placeholder = "Let's write an awesome story!",
      holder,
      className,
      showSaveButton = !!onSave,
      ...divProps
    },
    ref,
  ) => {
    const editorRef = useRef<EditorJS | null>(null);
    const holderId = useRef(holder ?? `editorjs-${uuidv4()}`);
    const saveDebounce = useRef<NodeJS.Timeout | null>(null);

    const [isReady, setIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const destroyEditor = useCallback(async () => {
      if (saveDebounce.current) clearTimeout(saveDebounce.current);
      if (editorRef.current) {
        try {
          await editorRef.current.destroy();
        } catch (err) {
          console.warn('Error destroying EditorJS', err);
        }
        editorRef.current = null;
      }
    }, []);

    const createEditor = useCallback(async () => {
      setIsLoading(true);
      setError(null);
      await destroyEditor();

      try {
        const tools = await loadTools();

        // Defer until after next tick to guarantee holder div exists
        setTimeout(() => {
          try {
            const instance = new EditorJS({
              holder: holderId.current,
              data: initialData,
              autofocus,
              readOnly,
              placeholder,
              tools,
              async onChange(api: API) {
                if (!onChange) return;
                if (saveDebounce.current) clearTimeout(saveDebounce.current);
                saveDebounce.current = setTimeout(async () => {
                  try {
                    const saved = await api.saver.save();
                    await onChange(saved);
                  } catch (err) {
                    console.error('EditorJS onChange save error', err);
                  }
                }, 500);
              },
              onReady() {
                editorRef.current = instance;
                setIsReady(true);
                setIsLoading(false);
              },
            });
          } catch (err) {
            console.error('Failed to init EditorJS', err);
            setError('Failed to initialise editor');
            setIsLoading(false);
          }
        }, 0);
      } catch (err) {
        console.error('Failed to load tools', err);
        setError('Failed to load editor tools');
        setIsLoading(false);
      }
    }, [autofocus, destroyEditor, initialData, onChange, placeholder, readOnly]);

    useEffect(() => {
      createEditor();
      return () => {
        destroyEditor();
      };
    }, [createEditor, destroyEditor]);

    useImperativeHandle(
      ref,
      (): EditorInstance => ({
        async save() {
          if (!editorRef.current) throw new Error('Editor not ready');
          return editorRef.current.save();
        },
        async destroy() {
          await destroyEditor();
        },
        async render(data) {
          if (!editorRef.current) throw new Error('Editor not ready');
          await editorRef.current.render(data);
        },
        focus() {
          editorRef.current?.focus();
        },
        isReady,
        getEditor() {
          return editorRef.current;
        },
      }),
      [destroyEditor, isReady],
    );

    const handleManualSave = async () => {
      if (!onSave || !editorRef.current) return;
      try {
        const data = await editorRef.current.save();
        await onSave(data);
      } catch (err) {
        console.error('Manual save failed', err);
      }
    };

    return (
      <div className={className} {...divProps}>
        {isLoading && <p>Loading editor…</p>}
        {error && (
          <p style={{ color: 'red' }} data-testid="editor-error">
            {error}
          </p>
        )}
        {/* The actual holder div */}
        <div id={holderId.current} style={{ display: isLoading ? 'none' : 'block' }} />
        {showSaveButton && !readOnly && (
          <button type="button" onClick={handleManualSave} disabled={isLoading} data-testid="save-button">
            Save
          </button>
        )}
      </div>
    );
  },
);

Editor.displayName = 'Editor';

export default Editor;
