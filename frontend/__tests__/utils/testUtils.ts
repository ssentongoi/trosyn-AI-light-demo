import { Document, DocumentVersion } from '@/types/tauri';

type MockDocumentOptions = {
  id?: string;
  title?: string;
  hasVersions?: boolean;
  isDirty?: boolean;
  versionsCount?: number;
};

export const createMockDocument = (options: MockDocumentOptions = {}): Document => {
  const {
    id = 'doc-1',
    title = 'Test Document',
    hasVersions = true,
    isDirty = false,
    versionsCount = 1,
  } = options;

  const now = new Date().toISOString();
  
  const versions: DocumentVersion[] = [];
  
  if (hasVersions) {
    for (let i = 0; i < versionsCount; i++) {
      const versionDate = new Date();
      versionDate.setDate(versionDate.getDate() - i);
      
      versions.push({
        id: `version-${i + 1}`,
        timestamp: versionDate.toISOString(),
        content: {
          blocks: [
            {
              type: 'paragraph',
              data: {
                text: `This is version ${i + 1} content`,
              },
            },
          ],
        },
        isAutoSave: i > 0 && i % 2 === 0, // Every other version is an auto-save
      });
    }
  }

  return {
    id,
    title,
    content: versions[0]?.content || { blocks: [] },
    versions,
    createdAt: now,
    updatedAt: now,
    isDirty,
  };
};

export const mockDocument = createMockDocument();

export const mockDocumentWithMultipleVersions = createMockDocument({
  versionsCount: 3,
});

export const mockDocumentNoVersions = createMockDocument({
  hasVersions: false,
});

export const mockDocumentDirty = createMockDocument({
  isDirty: true,
});

export const mockDocumentWithAutoSave = createMockDocument({
  versionsCount: 2,
});

// Mock Tauri API
export const mockTauriInvoke = (mockImpl = {}) => {
  const mock = vi.fn().mockImplementation((command: string, args?: any) => {
    if (mockImpl[command]) {
      return mockImpl[command](args);
    }
    
    switch (command) {
      case 'save_document':
        return Promise.resolve({
          ...mockDocument,
          ...args,
          updatedAt: new Date().toISOString(),
          isDirty: false,
        });
      
      case 'load_document':
        return Promise.resolve(mockDocument);
        
      case 'list_documents':
        return Promise.resolve([mockDocument]);
        
      case 'get_document_version':
        return Promise.resolve(mockDocument.versions[0]);
        
      case 'list_recovery_files':
        return Promise.resolve([]);
        
      default:
        return Promise.reject(new Error(`Unknown command: ${command}`));
    }
  });
  
  return {
    invoke: mock,
    reset: () => mock.mockReset(),
    calls: mock.mock.calls,
  };
};

// Mock window.__TAURI__
export const mockTauriWindow = () => {
  const mock = {
    invoke: vi.fn(),
  };
  
  beforeAll(() => {
    // @ts-ignore
    window.__TAURI__ = { invoke: mock.invoke };
  });
  
  afterAll(() => {
    // @ts-ignore
    delete window.__TAURI__;
  });
  
  return mock;
};

// Mock document service
export const mockDocumentService = () => ({
  createDocument: vi.fn().mockImplementation((title = 'Untitled Document') => ({
    id: `doc-${Date.now()}`,
    title,
    content: { blocks: [] },
    versions: [{
      id: `version-1`,
      timestamp: new Date().toISOString(),
      content: { blocks: [] },
      isAutoSave: false,
    }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDirty: true,
  })),
  
  saveDocument: vi.fn().mockImplementation((doc) => 
    Promise.resolve({
      ...doc,
      updatedAt: new Date().toISOString(),
      isDirty: false,
    })
  ),
  
  loadDocument: vi.fn().mockResolvedValue(mockDocument),
  listDocuments: vi.fn().mockResolvedValue([mockDocument]),
  getDocumentVersion: vi.fn().mockResolvedValue(mockDocument.versions[0]),
  listRecoveryFiles: vi.fn().mockResolvedValue([]),
});
