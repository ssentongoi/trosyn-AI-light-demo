const electron = require('electron');
const path = require('path');
const { getDatabaseService } = require('./services/DatabaseService');
const { initializeDatabaseService } = require('./database');
const { initializeFileWatcherService } = require('./services/FileWatcherService');

// Destructure after require to avoid duplicate declarations
const { app, BrowserWindow, ipcMain, dialog } = electron;

// Initialize database service with app instance
let databaseService;
if (app) {
  databaseService = getDatabaseService(app);
}

// Type definitions
type BrowserWindowType = typeof BrowserWindow;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

/** @type {import('electron').BrowserWindow | null} */
let mainWindow: BrowserWindowType | null = null;

// Helper function to safely access mainWindow
function withMainWindow(callback) {
  if (!mainWindow) {
    console.error('Main window is not available');
    return;
  }
  return callback(mainWindow);
}

const createWindow = async () => {
  // Create the browser window with common options
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hidden',
    backgroundColor: '#ffffff',
  });

  // and load the index.html of the app.
  if (process.env.NODE_ENV === 'development') {
    await mainWindow.loadURL('http://localhost:3001');
    // Open the DevTools in development mode.
    withMainWindow(win => {
      win.webContents.openDevTools();
    });
  } else {
    // In production, load the built version
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Emitted when the window is closed.
  if (mainWindow) {
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }
  
  return mainWindow;
};

// Types for IPC communication
interface DocumentData {
  id?: number;
  title: string;
  content: string;
  metadata?: string;
}

// Set up file system watcher
async function setupFileWatcher() {
  try {
    // Default watch path is the user's documents folder
    const documentsPath = app.getPath('documents');
    const watchPath = path.join(documentsPath, 'TrosynAI');
    
    // Initialize the file watcher service
    const fileWatcher = await initializeFileWatcherService();
    
    // Initialize the watcher with the path
    await fileWatcher.initialize(watchPath);
    console.log(`File watcher initialized at: ${watchPath}`);
    
    // Clean up on app quit
    app.on('will-quit', async () => {
      await fileWatcher.stopWatching();
    });
    
    return watchPath;
  } catch (error) {
    console.error('Failed to initialize file watcher:', error);
    return null;
  }
}

// Set up IPC handlers for database and file operations
async function setupIpcHandlers() {
  // Initialize database service
  const dbService = await initializeDatabaseService();
  
  // Get all documents
  ipcMain.handle('db:getAllDocuments', async () => {
    try {
      return { success: true, data: dbService.getAllDocuments() };
    } catch (error: unknown) {
      console.error('Error getting all documents:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  });

  // Get a single document by ID
  ipcMain.handle('db:getDocument', async (_event, id) => {
    try {
      const document = dbService.getDocument(id);
      if (!document) {
        return { success: false, error: 'Document not found' };
      }
      return { success: true, data: document };
    } catch (error: unknown) {
      console.error(`Error getting document ${id}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  });

  // Create a new document
  ipcMain.handle('db:createDocument', async (_event, document) => {
    try {
      if (!document.title || !document.content) {
        return { success: false, error: 'Title and content are required' };
      }
      const id = dbService.createDocument(document.title, document.content, document.metadata);
      return { success: true, data: { id } };
    } catch (error: unknown) {
      console.error('Error creating document:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  });

  // Update an existing document
  ipcMain.handle('db:updateDocument', async (_event, id, updates) => {
    try {
      // Verify document exists
      if (!dbService.getDocument(id)) {
        return { success: false, error: 'Document not found' };
      }
      
      const result = dbService.updateDocument(id, updates);
      return { success: result, data: { id } };
    } catch (error: unknown) {
      console.error(`Error updating document ${id}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  });

  // Delete a document
  ipcMain.handle('db:deleteDocument', async (_event, id) => {
    try {
      // Verify document exists
      if (!dbService.getDocument(id)) {
        return { success: false, error: 'Document not found' };
      }
      
      const result = dbService.deleteDocument(id);
      return { success: result, data: { id } };
    } catch (error: unknown) {
      console.error(`Error deleting document ${id}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  });

  // Search documents by title or content
  ipcMain.handle('db:searchDocuments', async (_event, query) => {
    try {
      const searchTerm = `%${query}%`;
      const stmt = (dbService as any).prepare(`
        SELECT * FROM documents 
        WHERE title LIKE ? OR content LIKE ?
        ORDER BY updated_at DESC
      `);
      const results = stmt.all(searchTerm, searchTerm);
      return { success: true, data: results };
    } catch (error: unknown) {
      console.error('Search failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });
  
  // File system operations
  let fileWatcher: Awaited<ReturnType<typeof initializeFileWatcherService>> | null = null;
  
  ipcMain.handle('fs:selectDirectory', async () => {
    try {
      // Get the dialog result and handle it properly
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select a directory to watch for documents'
      });
      
      let watchPath: string;
      
      // Handle different return types from dialog.showOpenDialog
      if (Array.isArray(result)) {
        // Handle older Electron versions that return string[]
        if (result.length === 0) {
          return { success: false, error: 'No directory selected' };
        }
        watchPath = result[0];
      } else {
        // Handle newer Electron versions that return { canceled: boolean, filePaths: string[] }
        const dialogResult = result as unknown as { canceled: boolean; filePaths: string[] };
        if (dialogResult.canceled || !dialogResult.filePaths || dialogResult.filePaths.length === 0) {
          return { success: false, error: 'No directory selected' };
        }
        watchPath = dialogResult.filePaths[0];
      }
      
      // Initialize file watcher if not already done
      if (!fileWatcher) {
        fileWatcher = await initializeFileWatcherService();
      }
      
      // Initialize the file watcher with the selected directory
      await fileWatcher.initialize(watchPath);
      
      return { success: true, data: { path: watchPath } };
    } catch (error: unknown) {
      console.error('Failed to set watch directory:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to set watch directory' 
      };
    }
  });
  
  ipcMain.handle('fs:getWatchPath', () => {
    if (!fileWatcher) {
      return { 
        success: true, 
        data: { 
          path: '',
          isActive: false
        } 
      };
    }
    
    return { 
      success: true, 
      data: { 
        path: fileWatcher.getWatchPath(),
        isActive: fileWatcher.isActive()
      } 
    };
  });

  // Select a directory to watch
  ipcMain.handle('select:directory', async () => {
    try {
      // Get the dialog result and handle it properly
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select a directory to watch for documents'
      });
      
      let watchPath: string;
      
      // Handle different return types from dialog.showOpenDialog
      if (Array.isArray(result)) {
        // Handle older Electron versions that return string[]
        if (result.length === 0) {
          return { success: false, error: 'No directory selected' };
        }
        watchPath = result[0];
      } else {
        // Handle newer Electron versions that return { canceled: boolean, filePaths: string[] }
        const dialogResult = result as unknown as { canceled: boolean; filePaths: string[] };
        if (dialogResult.canceled || !dialogResult.filePaths || dialogResult.filePaths.length === 0) {
          return { success: false, error: 'No directory selected' };
        }
        watchPath = dialogResult.filePaths[0];
      }
      
      // Initialize file watcher if not already done
      if (!fileWatcher) {
        fileWatcher = await initializeFileWatcherService();
      }
      
      // Initialize the file watcher with the selected directory
      await fileWatcher.initialize(watchPath);
      
      return { success: true, data: { path: watchPath } };
    } catch (error: unknown) {
      console.error('Failed to set watch directory:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to set watch directory' 
      };
    }
  });

  // Get file stats
  ipcMain.handle('get:fileStats', async (_, filePath) => {
    try {
      const stats = await fileWatcher?.getFileStats(filePath);
      return { success: true, data: stats };
    } catch (error: unknown) {
      console.error('Failed to get file stats:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get file stats' 
      };
    }
  });

  // Get the current watch directory
  ipcMain.handle('get:watchDirectory', async () => {
    try {
      const watchPath = fileWatcher?.getWatchPath();
      return { success: true, data: { path: watchPath } };
    } catch (error: unknown) {
      console.error('Failed to get watch directory:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get watch directory' 
      };
    }
  });

  // Document CRUD operations
  ipcMain.handle('db:createDocument', async (_event, title, content, metadata = '{}') => {
    try {
      const id = dbService.createDocument(title, content, metadata);
      return { success: true, data: { id } };
    } catch (error: unknown) {
      console.error('Error creating document:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create document' 
      };
    }
  });

  ipcMain.handle('db:updateDocument', async (_event, id, updates) => {
    try {
      const success = dbService.updateDocument(id, updates);
      return { success, data: { id } };
    } catch (error: unknown) {
      console.error(`Error updating document ${id}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update document' 
      };
    }
  });

  ipcMain.handle('db:deleteDocument', async (_event, id) => {
    try {
      const success = dbService.deleteDocument(id);
      return { success, data: { id } };
    } catch (error: unknown) {
      console.error(`Error deleting document ${id}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete document' 
      };
    }
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  try {
    // Initialize database service (already done at the module level)
    if (!databaseService) {
      throw new Error('Failed to initialize database service');
    }
    
    // Setup IPC handlers with the database service
    await setupIpcHandlers();
    
    // Create the main window
    createWindow();
    
    // Setup file watcher after window is created
    await setupFileWatcher();
    
    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    // Exit with error code if initialization fails
    app.exit(1);
  }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// IPC handlers can be added here
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});
