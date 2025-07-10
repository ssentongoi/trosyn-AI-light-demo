declare module '@editorjs/editorjs' {
  export interface OutputData {
    time?: number;
    blocks: Array<{
      type: string;
      data: any;
    }>;
    version?: string;
  }

  export interface EditorConfig {
    holder: string | HTMLElement;
    placeholder?: string;
    readOnly?: boolean;
    autofocus?: boolean;
    data?: OutputData;
    onChange?: (api: any, event?: CustomEvent) => void;
    onReady?: () => void;
    tools?: Record<string, any>;
  }

  export default class EditorJS {
    constructor(config: EditorConfig);
    isReady: Promise<void>;
    render(data: OutputData): Promise<void>;
    save(): Promise<OutputData>;
    destroy(): Promise<void>;
    clear(): void;
    focus(): void;
    // Add other EditorJS methods as needed
  }
}
