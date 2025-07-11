import { v4 as uuidv4 } from 'uuid';

/**
 * Mock dialog service for browser development
 */
class MockDialogService {
  private saveCallbacks: ((path: string | null) => void)[] = [];
  private openCallbacks: ((path: string | null) => void)[] = [];

  // Mock file save dialog
  async showSaveDialog(options: {
    title?: string;
    filters?: { name: string; extensions: string[] }[];
  }): Promise<string | null> {
    console.log('[MockDialog] Save dialog shown with options:', options);
    
    // In a real implementation, this would show a browser file save dialog
    // For now, we'll just return a mock path
    const mockPath = `/mock/path/document-${uuidv4().substring(0, 8)}.json`;
    
    // Simulate user delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return mockPath;
  }

  // Mock file open dialog
  async showOpenDialog(options: {
    title?: string;
    filters?: { name: string; extensions: string[] }[];
    multiple?: boolean;
  }): Promise<string | string[] | null> {
    console.log('[MockDialog] Open dialog shown with options:', options);
    
    // In a real implementation, this would show a browser file open dialog
    // For now, we'll just return a mock path
    const mockPath = `/mock/path/document-${uuidv4().substring(0, 8)}.json`;
    
    // Simulate user delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return options.multiple ? [mockPath] : mockPath;
  }
}

export const mockDialogService = new MockDialogService();
