// Tauri command types
declare module "@tauri-apps/api/tauri" {
  interface InvokeArgs {
    [key: string]: unknown;
  }

  function invoke<T>(cmd: string, args?: InvokeArgs): Promise<T>;
}

// Document types
declare interface DocumentVersion {
  id: string;
  timestamp: string;
  content: any;
  isAutoSave: boolean;
}

declare interface Document {
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
declare namespace TauriCommands {
  // Document commands
  interface SaveDocumentArgs {
    content: string; // JSON string of Document
    filePath?: string;
  }

  interface LoadDocumentArgs {
    filePath?: string;
  }

  interface GetDocumentVersionArgs {
    docId: string;
    versionId: string;
  }

  interface RestoreDocumentVersionArgs {
    docId: string;
    versionId: string;
  }

  interface DeleteDocumentArgs {
    docId: string;
    filePath: string;
  }

  // Response types
  type DocumentResponse = Document;
  type DocumentListResponse = Document[];
  type VersionResponse = DocumentVersion;
  type EmptyResponse = void;
}

// Extend the Window interface for Tauri-specific APIs
declare interface Window {
  __TAURI__: {
    invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
    // Add other Tauri APIs as needed
  };\n}
