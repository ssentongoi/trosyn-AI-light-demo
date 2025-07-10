import { invoke } from '@tauri-apps/api/tauri';

export interface Document {
  id?: string;
  title: string;
  content: any; // Editor.js output data
  createdAt?: Date;
  updatedAt?: Date;
}

export const DocumentService = {
  async listDocuments(): Promise<Document[]> {
    try {
      return await invoke('list_documents');
    } catch (error) {
      console.error('Failed to list documents:', error);
      return [];
    }
  },

  async getDocument(id: string): Promise<Document | null> {
    try {
      return await invoke('get_document', { id });
    } catch (error) {
      console.error(`Failed to get document ${id}:`, error);
      return null;
    }
  },

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
  },

  async loadDocument(filePath: string): Promise<Document> {
    try {
      return await invoke('load_document', { file_path: filePath });
    } catch (error) {
      console.error('Failed to load document:', error);
      throw error;
    }
  },

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
  },

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
  },

  async deleteDocument(id: string): Promise<boolean> {
    try {
      await invoke('delete_document', { id });
      return true;
    } catch (error) {
      console.error(`Failed to delete document ${id}:`, error);
      return false;
    }
  },

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
  },
};

export default DocumentService;
