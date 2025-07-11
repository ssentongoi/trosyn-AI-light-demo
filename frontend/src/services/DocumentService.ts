import { invoke } from '@tauri-apps/api/tauri';
import { isTauri } from '../utils/environment';
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

class DocumentServiceClass {
  protected static instance: DocumentServiceClass | null = null;
  private autoSaveInterval: number | null = null;
  private currentDocument: Document | null = null;
  private lastSaveTime: number = 0;
  private pendingChanges: boolean = false;
  
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
    }
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
    if (isTauri() && this.currentDocument.filePath) {
      try {
        await invoke('save_document', {
          content: JSON.stringify(this.currentDocument),
          filePath: this.currentDocument.filePath
        });
        this.pendingChanges = false;
      } catch (error) {
        console.error('Auto-save failed:', error);
        throw error;
      }
    }
    
    return version;
  }

  // Check for recovery files
  private async checkForRecoveryFiles() {
    if (!isTauri()) return [];
    
    try {
      // In a real implementation, this would check for recovery files
      // For now, we'll just return an empty array
      return [];
    } catch (error) {
      console.error('Error checking for recovery files:', error);
      return [];
    }
  }

  // List documents
  async listDocuments(): Promise<Document[]> {
    try {
      if (isTauri()) {
        const docs = await invoke<Document[]>('list_documents');
        return docs.map(doc => ({
          ...doc,
          versions: doc.versions || [],
          isDirty: false
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
        doc = await invoke<Document>('get_document', { id });
      } else {
        // Mock implementation for browser
        const docs = await this.listDocuments();
        doc = docs.find(d => d.id === id) || null;
        if (!doc) return null;
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
      console.log('Saving document with content length:', content.length, 'filePath:', filePath);
      const result = await invoke('save_document', {
        content,
        file_path: filePath || null,
      });
      console.log('Save document result:', result);
      return result as Document;
    } catch (error) {
      console.error('Failed to save document:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        contentLength: content?.length,
        filePath
      });
      throw error;
    }
  }

  async loadDocument(filePath: string): Promise<Document> {
    try {
      return await invoke('load_document', { file_path: filePath }) as Document;
    } catch (error) {
      console.error('Failed to load document:', error);
      throw error;
    }
  }

  async loadDocumentWithDialog(): Promise<Document> {
    try {
      console.log('Loading document with dialog');
      const result = await invoke('load_document_with_dialog');
      console.log('Load document result:', result);
      return result as Document;
    } catch (error) {
      console.error('Failed to load document with dialog:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async exportDocument(content: string, format: string, filePath?: string): Promise<void> {
    try {
      console.log('Exporting document as', format, 'content length:', content.length, 'filePath:', filePath);
      await invoke('export_document', {
        content,
        format,
        file_path: filePath || null,
      });
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
    };
  }
}

export const DocumentService = DocumentServiceClass.getInstance();
export { DocumentServiceClass };
