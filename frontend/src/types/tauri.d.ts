// Tauri API types
declare module '@tauri-apps/api/tauri' {
  export interface InvokeArgs {
    [key: string]: unknown;
  }
  
  export function invoke<T = void>(command: string, args?: InvokeArgs): Promise<T>;
  export function convertFileSrc(filePath: string, protocol?: string): string;
}

declare module '@tauri-apps/plugin-dialog' {
  export interface OpenDialogOptions {
    title?: string;
    defaultPath?: string;
    directory?: boolean;
    multiple?: boolean;
    filters?: Array<{ name: string; extensions: string[] }>;
  }

  export interface SaveDialogOptions {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }

  export function open(options?: OpenDialogOptions): Promise<string | string[] | null>;
  export function save(options?: SaveDialogOptions): Promise<string | null>;
}

declare module '@tauri-apps/plugin-fs' {
  type Dir = 'App' | 'Audio' | 'Cache' | 'Config' | 'Data' | 'LocalData' | 'Desktop' | 'Document' | 'Download' | 'Executable' | 'Font' | 'Home' | 'Picture' | 'Public' | 'Runtime' | 'Template' | 'Video' | 'Resource' | 'Log' | 'Temp' | 'AppConfig' | 'AppData' | 'AppLocalData' | 'AppCache' | 'AppLog';
  
  export function readTextFile(path: string, options?: { dir?: Dir }): Promise<string>;
  export function writeTextFile(path: string, contents: string, options?: { dir?: Dir, append?: boolean }): Promise<void>;
  export function exists(path: string, options?: { dir?: Dir }): Promise<boolean>;
}

declare module '@tauri-apps/api/path' {
  export function join(...paths: string[]): Promise<string>;
  export function basename(path: string, ext?: string): Promise<string>;
  export function dirname(path: string): Promise<string>;
  export function extname(path: string): Promise<string>;
  export function isAbsolute(path: string): Promise<boolean>;
  export function normalize(path: string): Promise<string>;
  export function resolve(...paths: string[]): Promise<string>;
  export const sep: string;
  export const delimiter: string;
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
