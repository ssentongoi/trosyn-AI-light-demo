import { tauriService } from '../utils/tauriService';
import { isTauri } from '../utils/environment';

// Type definitions for document operations
type FileSystemItem = {
  name: string;
  path: string;
  isFile: boolean;
};

// Mock implementations for web environment
const mockFs = {
  readTextFile: async (): Promise<string> => {
    console.log('Tauri not available, using mock FS implementation');
    return '';
  },
  writeFile: async (): Promise<void> => {
    console.log('Tauri not available, using mock FS implementation');
  },
  exists: async (): Promise<boolean> => false,
  createDir: async (): Promise<void> => {},
  readDir: async (): Promise<FileSystemItem[]> => [],
  removeFile: async (): Promise<void> => {
    console.log('Tauri not available, using mock FS implementation');
  }
};

// Use Tauri service if available, otherwise use mocks
const fs = tauriService.isTauri ? {
  readTextFile: async (path: string): Promise<string> => {
    return await tauriService.readFile(path);
  },
  writeFile: async (path: string, contents: string): Promise<void> => {
    await tauriService.writeFile(path, contents);
  },
  exists: async (path: string): Promise<boolean> => {
    return await tauriService.fileExists(path);
  },
  createDir: async (path: string, options?: { recursive: boolean }): Promise<void> => {
    await tauriService.invoke('fs_create_dir', { path, ...options });
  },
  readDir: async (path: string): Promise<FileSystemItem[]> => {
    return await tauriService.invoke('fs_read_dir', { path });
  },
  removeFile: async (path: string): Promise<void> => {
    await tauriService.invoke('fs_remove_file', { path });
  }
} : mockFs;

// Tauri invoke wrapper with better typing
const invoke = async <T = any>(cmd: string, args?: Record<string, any>): Promise<T> => {
  if (tauriService.isTauri) {
    return await tauriService.invoke<T>(cmd, args);
  }
  console.log(`Tauri not available, skipping invoke: ${cmd}`);
  return null as any;
};

console.log('DocumentService initialized with Tauri support:', tauriService.isTauri);

import { mockDialogService } from './MockDialogService';
import { v4 as uuidv4 } from 'uuid';

// Document version information
export interface DocumentVersion {
  id: string;
  timestamp: Date;
  content: any;
  isAutoSave?: boolean;
}

export interface Document {
  id: string;
  title: string;
  content: any; // Editor.js output data
  filePath?: string;
  versions: DocumentVersion[];
  createdAt: Date;
  updatedAt: Date;
  lastAutoSaveAt?: Date;
  isDirty?: boolean;
}

// Auto-save configuration
const AUTO_SAVE_INTERVAL = 30 * 1000; // 30 seconds
const MAX_VERSIONS = 10; // Maximum number of versions to keep

// Type for file change callback
type FileChangeCallback = (event: { path: string; content: string }) => void;

class DocumentServiceClass {
  protected static instance: DocumentServiceClass | null = null;
  private autoSaveInterval: number | null = null;
  private currentDocument: Document | null = null;
  private lastSaveTime: number = 0;
  private pendingChanges: boolean = false;
  private fileWatchers: Map<string, FileChangeCallback> = new Map();
  private isWatching: boolean = false;
  
  // Private constructor to enforce singleton pattern
  private constructor() {}
  
  // Get the singleton instance
  public static getInstance(): DocumentServiceClass {
    if (!DocumentServiceClass.instance) {
      DocumentServiceClass.instance = new DocumentServiceClass();
    }
    return DocumentServiceClass.instance;
  }

  // Reset the singleton instance (for testing)
  public static reset(): void {
    if (DocumentServiceClass.instance) {
      // Clean up any intervals
      if (DocumentServiceClass.instance.autoSaveInterval) {
        clearInterval(DocumentServiceClass.instance.autoSaveInterval);
      }
      DocumentServiceClass.instance = null;
    }
  }

  // Initialize the document service
  initialize() {
    if (isTauri()) {
      this.setupAutoSave();
      this.setupRecovery();
    }
    
    // Add beforeunload listener for recovery
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  // Cleanup resources
  cleanup() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    this.stopWatchingFiles();
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }

  // Set up auto-save functionality
  private setupAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = window.setInterval(async () => {
      if (this.currentDocument?.isDirty) {
        try {
          await this.autoSaveCurrentDocument();
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    }, AUTO_SAVE_INTERVAL);
  }

  // Set up document recovery
  private setupRecovery() {
    if (isTauri()) {
      this.checkForRecoveryFiles().catch(console.error);
      this.setupFileWatching().catch(console.error);
    }
  }

  // Set up file watching for the current document
  private async setupFileWatching() {
    if (!isTauri()) return;
    
    try {
      const { watch } = await import('@tauri-apps/plugin-fs');
      
      // Stop any existing watchers
      this.stopWatchingFiles();
      
      // Watch the current document's directory if available
      if (this.currentDocument?.filePath) {
        const path = await import('@tauri-apps/api/path');
        const dir = await path.dirname(this.currentDocument.filePath);
        
        const unwatch = await watch(
          dir,
          async (event) => {
            // WatchEvent uses 'paths' array, not 'path'
            const eventPath = event.paths[0]; // Get the first path from the array
            if (eventPath === this.currentDocument?.filePath) {
              try {
                const content = await fs.readTextFile(eventPath);
                const callback = this.fileWatchers.get(eventPath);
                if (callback) {
                  callback({ path: eventPath, content });
                }
              } catch (error) {
                console.error('Error handling file change:', error);
              }
            }
          },
          { recursive: false }
        );
        
        this.isWatching = true;
        return unwatch;
      }
    } catch (error) {
      console.error('Failed to set up file watching:', error);
    }
  }
  
  // Stop all file watchers
  private stopWatchingFiles() {
    // In a real implementation, we would keep track of and stop the watchers
    // For now, we just update the flag
    this.isWatching = false;
  }
  
  // Watch a file for changes
  watchFile(filePath: string, callback: FileChangeCallback): () => void {
    this.fileWatchers.set(filePath, callback);
    
    // Return cleanup function
    return () => {
      this.fileWatchers.delete(filePath);
    };
  }

  // Handle beforeunload event
  private handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (this.currentDocument?.isDirty) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    }
  };

  // Auto-save the current document
  private async autoSaveCurrentDocument() {
    if (!this.currentDocument) return;
    
    const now = Date.now();
    if (now - this.lastSaveTime < AUTO_SAVE_INTERVAL) return;
    
    this.lastSaveTime = now;
    
    // Create a new version
    const version: DocumentVersion = {
      id: uuidv4(),
      timestamp: new Date(),
      content: this.currentDocument.content,
      isAutoSave: true
    };
    
    // Add to versions (limit to MAX_VERSIONS)
    this.currentDocument.versions.unshift(version);
    if (this.currentDocument.versions.length > MAX_VERSIONS) {
      this.currentDocument.versions.pop();
    }
    
    this.currentDocument.lastAutoSaveAt = version.timestamp;
    
    // Save to persistent storage if in Tauri
    if (isTauri && this.currentDocument.filePath) {
      try {
        // Save the document
        await fs.writeFile(
          this.currentDocument.filePath, 
          typeof this.currentDocument.content === 'string' 
            ? this.currentDocument.content 
            : JSON.stringify(this.currentDocument.content)
        );
        
        // Also save recovery data
        await this.saveRecoveryData(
          typeof this.currentDocument.content === 'string'
            ? this.currentDocument.content
            : JSON.stringify(this.currentDocument.content)
        );
        
        this.pendingChanges = false;
      } catch (error) {
        console.error('Auto-save failed:', error);
        throw error;
      }
    }
    
    return version;
  }

  // Check for recovery files and auto-saves
  public async checkForRecoveryFiles(): Promise<Array<{path: string, lastModified: Date}>> {
    if (!isTauri()) return [];
    
    try {
      const path = await import('@tauri-apps/api/path');
      const appDataDir = await path.appDataDir();
      const recoveryDir = await path.join(appDataDir, 'recovery');
      
      // Ensure recovery directory exists
      try {
        await fs.createDir(recoveryDir, { recursive: true });
      } catch (error) {
        console.error('Failed to create recovery directory:', error);
        return [];
      }
      
      // List recovery files
      const entries = await fs.readDir(recoveryDir);
      const recoveryFiles = entries
        .filter(entry => entry.isFile && entry.name.endsWith('.recovery.json'))
        .map(entry => ({
          path: entry.path,
          name: entry.name,
          lastModified: new Date() // In a real implementation, we'd get this from file stats
        }));
      
      return recoveryFiles;
    } catch (error) {
      console.error('Error checking for recovery files:', error);
      return [];
    }
  }
  
  // Save recovery data for the current document
  private async saveRecoveryData(content: string): Promise<void> {
    if (!isTauri() || !this.currentDocument?.filePath) return;
    
    try {
      const path = await import('@tauri-apps/api/path');
      const appDataDir = await path.appDataDir();
      const recoveryDir = await path.join(appDataDir, 'recovery');
      const fileName = `${Date.now()}_${path.basename(this.currentDocument.filePath)}.recovery.json`;
      const recoveryPath = await path.join(recoveryDir, fileName);
      
      const recoveryData = {
        originalPath: this.currentDocument.filePath,
        content,
        timestamp: new Date().toISOString()
      };
      
      await fs.writeFile(recoveryPath, JSON.stringify(recoveryData));
      
      // Clean up old recovery files (keep last 5)
      const recoveryFiles = await this.checkForRecoveryFiles();
      if (recoveryFiles.length > 5) {
        const filesToDelete = recoveryFiles
          .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
          .slice(5);
          
        for (const file of filesToDelete) {
          try {
            await fs.removeFile(file.path);
          } catch (error) {
            console.error('Failed to clean up old recovery file:', error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to save recovery data:', error);
    }
  }

  // List documents
  async listDocuments(): Promise<Document[]> {
    try {
      if (isTauri()) {
        const docs = await invoke<Array<Document & { createdAt: string; updatedAt: string }>>('list_documents');
        return docs.map((doc: Document & { createdAt: string; updatedAt: string }) => ({
          ...doc,
          versions: doc.versions || [],
          isDirty: false,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt)
        }));
      } else {
        // Mock implementation for browser
        const savedDocs = localStorage.getItem('documents');
        return savedDocs ? JSON.parse(savedDocs) : [];
      }
    } catch (error) {
      console.error('Failed to list documents:', error);
      return [];
    }
  }

  // Get a document by ID
  async getDocument(id: string): Promise<Document | null> {
    try {
      let doc: Document;
      
      if (isTauri()) {
        const result = await invoke<Document & { createdAt: string; updatedAt: string }>('get_document', { id });
        doc = {
          ...result,
          versions: result.versions || [],
          createdAt: new Date(result.createdAt),
          updatedAt: new Date(result.updatedAt)
        };
      } else {
        // Mock implementation for browser
        const docs = await this.listDocuments();
        const foundDoc = docs.find(d => d.id === id);
        if (!foundDoc) return null;
        doc = foundDoc;
      }
      
      // Ensure versions array exists
      if (!doc.versions) {
        doc.versions = [];
      }
      
      // Set as current document
      this.currentDocument = doc;
      this.lastSaveTime = Date.now();
      this.pendingChanges = false;
      
      return doc;
    } catch (error) {
      console.error(`Failed to get document ${id}:`, error);
      return null;
    }
  }

  async saveDocument(content: string, filePath?: string): Promise<Document> {
    try {
      const now = new Date();
      const isNewFile = !this.currentDocument?.filePath && !!filePath;
      const previousPath = this.currentDocument?.filePath;
      
      const doc: Document = {
        id: this.currentDocument?.id || uuidv4(),
        title: this.currentDocument?.title || filePath?.split('/').pop() || 'Untitled Document',
        content,
        filePath: filePath || this.currentDocument?.filePath,
        versions: this.currentDocument?.versions || [],
        createdAt: this.currentDocument?.createdAt || now,
        updatedAt: now,
        isDirty: false
      };

      // Save to file system
      if (doc.filePath) {
        try {
          if (isTauri()) {
            // Ensure directory exists
            const path = await import('@tauri-apps/api/path');
            const dir = await path.dirname(doc.filePath);
            await fs.createDir(dir, { recursive: true });
            
            // Save the file
            await fs.writeFile(doc.filePath, typeof content === 'string' ? content : JSON.stringify(content));
            
            // If this is a new file or the path changed, update file watching
            if (isNewFile || previousPath !== doc.filePath) {
              await this.setupFileWatching();
            }
          } else {
            // In web environment, use localStorage
            const docs = await this.listDocuments();
            const existingDocIndex = docs.findIndex(d => d.id === doc.id);
            
            if (existingDocIndex >= 0) {
              docs[existingDocIndex] = doc;
            } else {
              docs.push(doc);
            }
            
            localStorage.setItem('documents', JSON.stringify(docs));
          }
        } catch (error) {
          console.error('Error saving file:', error);
          throw new Error(`Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      this.currentDocument = doc;
      this.lastSaveTime = Date.now();
      this.pendingChanges = false;
      
      return doc;
    } catch (error) {
      console.error('Error saving document:', error);
      throw error;
    }
  }

  async loadDocument(filePath: string): Promise<Document> {
    try {
      let content: string;
      let doc: Document;
      
      if (isTauri()) {
        // In Tauri environment, read directly from file system
        content = await fs.readTextFile(filePath);
        try {
          // Try to parse as JSON (for structured documents)
          doc = JSON.parse(content);
        } catch (e) {
          // If not valid JSON, treat as plain text
          doc = {
            id: uuidv4(),
            title: filePath.split('/').pop() || 'Untitled',
            content,
            filePath,
            versions: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            isDirty: false
          };
        }
      } else {
        // In web environment, try to load from localStorage
        const docs = await this.listDocuments();
        const foundDoc = docs.find(d => d.filePath === filePath);
        if (!foundDoc) {
          throw new Error(`Document not found: ${filePath}`);
        }
        doc = foundDoc;
      }
      
      // Ensure required fields
      doc.id = doc.id || uuidv4();
      doc.versions = doc.versions || [];
      doc.createdAt = doc.createdAt ? new Date(doc.createdAt) : new Date();
      doc.updatedAt = doc.updatedAt ? new Date(doc.updatedAt) : new Date();
      doc.isDirty = false;
      
      // Set as current document
      this.currentDocument = doc;
      this.lastSaveTime = Date.now();
      this.pendingChanges = false;
      
      return doc;
    } catch (error) {
      console.error('Failed to load document:', error);
      throw new Error(`Failed to load document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async loadDocumentWithDialog(): Promise<Document> {
    try {
      console.log('Opening file dialog');
      
      if (isTauri()) {
        // In Tauri environment, use native file dialog
        const { open } = await import('@tauri-apps/plugin-dialog');
        const { readTextFile, writeTextFile, exists } = await import('@tauri-apps/plugin-fs');
        
        // Show file open dialog
        const selected = await open({
          multiple: false,
          filters: [{
            name: 'Documents',
            extensions: ['md', 'txt', 'json', 'doc', 'docx']
          }]
        });
        
        if (!selected || Array.isArray(selected)) {
          throw new Error('No file selected');
        }
        
        // Load the selected file
        return await this.loadDocument(selected);
      } else {
        // In web environment, use a file input
        return new Promise((resolve, reject) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.md,.txt,.json,.doc,.docx';
          
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
              reject(new Error('No file selected'));
              return;
            }
            
            try {
              const content = await file.text();
              const doc: Document = {
                id: uuidv4(),
                title: file.name,
                content,
                filePath: file.name,
                versions: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                isDirty: false
              };
              
              // Save to localStorage for web
              const docs = await this.listDocuments();
              docs.push(doc);
              localStorage.setItem('documents', JSON.stringify(docs));
              
              resolve(doc);
            } catch (error) {
              console.error('Error reading file:', error);
              reject(new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
          };
          
          input.click();
        });
      }
    } catch (error) {
      console.error('Failed to load document with dialog:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Failed to open document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async saveDocumentWithDialog(content: string, defaultName: string = 'untitled.txt'): Promise<string | null> {
    try {
      if (isTauri()) {
        // In Tauri environment, use native save dialog
        const { save } = await import('@tauri-apps/plugin-dialog');
        
        // Show save dialog
        const selectedPath = await save({
          defaultPath: defaultName,
          filters: [{
            name: 'Documents',
            extensions: ['md', 'txt', 'json']
          }]
        });
        
        if (!selectedPath) {
          return null; // User cancelled
        }
        
        // Save the document
        await this.saveDocument(content, selectedPath);
        return selectedPath;
      } else {
        // In web environment, use download dialog
        return new Promise((resolve) => {
          const blob = new Blob([content], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = defaultName;
          
          a.onclick = () => {
            setTimeout(() => {
              URL.revokeObjectURL(url);
              resolve(defaultName);
            }, 100);
          };
          
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          // For web, we can't get the actual file path, so we return the default name
          return defaultName;
        });
      }
    } catch (error) {
      console.error('Failed to save document with dialog:', error);
      throw new Error(`Failed to save document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exportDocument(content: string, format: string, filePath?: string): Promise<void> {
    try {
      console.log('Exporting document as', format, 'content length:', content.length, 'filePath:', filePath);
      
      if (isTauri()) {
        // In Tauri, use native dialog for export if no path provided
        if (!filePath) {
          const { save } = await import('@tauri-apps/plugin-dialog');
          const selectedPath = await save({
            defaultPath: `export.${format}`,
            filters: [{
              name: 'Export',
              extensions: [format]
            }]
          });
          
          if (selectedPath) {
            filePath = selectedPath;
          } else {
            return; // User cancelled
          }
        }
        
        // Save the exported content
        await fs.writeFile(filePath, content);
      } else {
        // In web, trigger download
        const blob = new Blob([content], { type: `application/${format}` });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filePath || `export.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      console.log('Export document completed successfully');
    } catch (error) {
      console.error('Failed to export document:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        format,
        contentLength: content?.length,
        filePath
      });
      throw error;
    }
  }

  async deleteDocument(id: string): Promise<boolean> {
    try {
      await invoke('delete_document', { id });
      return true;
    } catch (error) {
      console.error(`Failed to delete document ${id}:`, error);
      return false;
    }
  }

  // Helper to create a new empty document
  createEmptyDocument(title: string = 'Untitled Document'): Omit<Document, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      title,
      content: {
        time: new Date().getTime(),
        blocks: [
          {
            type: 'header',
            data: {
              text: title,
              level: 2,
            },
          },
        ],
      },
      versions: [], // Initialize with empty versions array
    };
  }
}

export const DocumentService = DocumentServiceClass.getInstance();
export { DocumentServiceClass };
