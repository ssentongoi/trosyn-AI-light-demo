// Mock Tauri API for testing
export const invoke = vi.fn().mockImplementation((cmd: string, args?: Record<string, unknown>) => {
  if (cmd === 'load_document') {
    return Promise.resolve({
      id: 'doc-123',
      title: 'Test Document',
      content: 'Test content',
      filePath: '/test/path',
      versions: [{
        id: 'v1',
        content: 'Test content',
        createdAt: new Date().toISOString(),
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDirty: false,
    });
  }
  return Promise.resolve({});
});

export const convertFileSrc = vi.fn().mockImplementation((path: string) => `tauri://${path}`);
