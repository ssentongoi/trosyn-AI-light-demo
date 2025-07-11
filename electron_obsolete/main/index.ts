const electron = require('electron');
const { app, BrowserWindow, ipcMain } = electron;
const path = require('path');
const { logger } = require('./utils/logger');
const { config } = require('./config');
// Import services and managers
const { initializeFileWatcherService } = require('./services/FileWatcherService');
const { ipcManager } = require('./ipcManager');

// TypeScript type imports (these will be removed during compilation)
import type { BrowserWindow as ElectronBrowserWindow } from 'electron';

// Initialize logger
logger.info(`Starting ${config.app.name} v${config.app.version}`);
logger.info(`Environment: ${config.isDevelopment ? 'Development' : 'Production'}`);

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow = null;

/**
 * Creates the main browser window
 * @returns {Promise<Electron.BrowserWindow>}
 */
const createWindow = async () => {
  // Create the browser window with common options
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false, // Don't show until ready-to-show
    title: config.app.name,
    icon: path.join(__dirname, '../renderer/favicon.ico')
  });

  // Type assertion for mainWindow
  const win = mainWindow;

  try {
    // Load the index.html of the app.
    if (config.isDevelopment) {
      await win.loadURL('http://localhost:3001');
      // Open the DevTools in development mode.
      win.webContents.openDevTools();
    } else {
      await win.loadFile(path.join(__dirname, '../renderer/index.html'));
    }
  } catch (error) {
    console.error('Failed to load window:', error);
  }

  // Show window when ready
  win.once('ready-to-show', () => {
    if (win) {
      win.show();
    }
  });

  // Handle window closed event
  win.on('closed', () => {
    mainWindow = null;
  });

  // Handle window errors
  win.webContents.on('did-fail-load', (event: Electron.Event, errorCode: number, errorDescription: string) => {
    logger.error(`Window failed to load: ${errorCode} - ${errorDescription}`);
  });

  // Initialize IPC handlers
  try {
    ipcManager.initialize(ipcMain, win);
    logger.info('IPC handlers initialized');
  } catch (error) {
    logger.error('Failed to initialize IPC handlers:', error);
  }

  // Set up file watcher
  if (config.features.fileWatcher) {
    try {
      await initializeFileWatcherService(win);
      logger.info('File watcher service initialized');
    } catch (error) {
      logger.error('Failed to initialize file watcher service:', error);
    }
  }

  return win;
};

// Set up file system watcher
async function setupFileWatcher(): Promise<string | null> {
  try {
    // Default watch path is the user's documents folder
    const documentsPath = app.getPath('documents');
    const watchPath = path.join(documentsPath, 'TrosynAI');
    
    // Initialize the file watcher service
    const fileWatcher = await initializeFileWatcherService();
    
    // Initialize the watcher with the path
    await fileWatcher.initialize(watchPath);
    console.log(`File watcher initialized at: ${watchPath}`);
    
    return watchPath;
  } catch (error) {
    console.error('Failed to initialize file watcher:', error);
    return null;
  }
}




// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  try {

    
    // Initialize IPC manager
    await ipcManager.initialize();
    
    // Create the main window
    createWindow();
    
    // Setup file watcher after window is created
    try {
      const watchPath = await setupFileWatcher();
      if (watchPath) {
        logger.info(`File system watcher active in: ${watchPath}`);
      }
    } catch (error) {
      logger.error('Failed to initialize file watcher:', error);
    }
    
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

app.on('activate', async () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

