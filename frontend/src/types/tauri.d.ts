// Tauri command types
declare module "@tauri-apps/api/tauri" {
  export interface InvokeArgs {
    [key: string]: unknown;
  }

  export function invoke<T>(cmd: string, args?: InvokeArgs): Promise<T>;
}

// Document types
export interface DocumentVersion {
  id: string;
  timestamp: string;
  content: any;
  isAutoSave: boolean;
}

export interface Document {
  id: string;
  title: string;
  content: any;
  filePath?: string;
  versions: DocumentVersion[];
  createdAt: string;
  updatedAt: string;
  lastAutoSave?: string;
  isDirty: boolean;
}

// Tauri command payloads and responses
export namespace TauriCommands {
  // Document commands
  export interface SaveDocumentArgs {
    content: string; // JSON string of Document
    filePath?: string;
  }

  export interface LoadDocumentArgs {
    filePath?: string;
  }

  export interface GetDocumentVersionArgs {
    docId: string;
    versionId: string;
  }

  export interface RestoreDocumentVersionArgs {
    docId: string;
    versionId: string;
  }

  export interface DeleteDocumentArgs {
    docId: string;
    filePath: string;
  }

  // Response types
  export type DocumentResponse = Document;
  export type DocumentListResponse = Document[];
  export type VersionResponse = DocumentVersion;
  export type EmptyResponse = void;
}

// Extend the Window interface for Tauri-specific APIs
declare global {
  interface Window {
    __TAURI__: {
      invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      // Add other Tauri APIs as needed
    };
  }
}

export {};
