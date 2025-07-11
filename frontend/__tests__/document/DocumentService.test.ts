import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentService } from '../../services/DocumentService';
import { documentUtils } from '../../utils/documentUtils';

// Mock Tauri API
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
}));

describe('DocumentService', () => {
  let documentService: InstanceType<typeof DocumentService>;
  
  beforeEach(() => {
    documentService = DocumentService.getInstance();
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('createDocument', () => {
    it('should create a new document with default title', () => {
      const doc = documentService.createDocument();
      expect(doc.title).toBe('Untitled Document');
      expect(doc.versions).toHaveLength(1);
      expect(doc.isDirty).toBe(true);
    });

    it('should create a new document with custom title', () => {
      const doc = documentService.createDocument('Test Document');
      expect(doc.title).toBe('Test Document');
    });
  });

  describe('saveDocument', () => {
    it('should save a new document', async () => {
      const doc = documentService.createDocument();
      const savedDoc = await documentService.saveDocument(doc);
      
      expect(savedDoc).toBeDefined();
      expect(savedDoc.id).toBeDefined();
      expect(savedDoc.isDirty).toBe(false);
    });
  });

  describe('loadDocument', () => {
    it('should load an existing document', async () => {
      const doc = documentService.createDocument('Test Load');
      await documentService.saveDocument(doc);
      
      const loadedDoc = await documentService.loadDocument(doc.id);
      expect(loadedDoc).toBeDefined();
      expect(loadedDoc?.title).toBe('Test Load');
    });

    it('should return null for non-existent document', async () => {
      const loadedDoc = await documentService.loadDocument('non-existent-id');
      expect(loadedDoc).toBeNull();
    });
  });

  describe('versioning', () => {
    it('should create a new version on save', async () => {
      const doc = documentService.createDocument('Version Test');
      await documentService.saveDocument(doc);
      
      // Modify and save again
      const updatedDoc = { ...doc, title: 'Updated Title' };
      await documentService.saveDocument(updatedDoc);
      
      const loadedDoc = await documentService.loadDocument(doc.id);
      expect(loadedDoc?.versions).toHaveLength(2);
      expect(loadedDoc?.title).toBe('Updated Title');
    });
  });

  describe('recovery', () => {
    it('should detect recovery files', async () => {
      // Simulate a recovery file
      const recoveryDoc = documentService.createDocument('Recovery Test');
      await documentService.autoSaveDocument(recoveryDoc);
      
      const recoveryFiles = await documentService.listRecoveryFiles();
      expect(recoveryFiles.length).toBeGreaterThan(0);
    });
  });
});
