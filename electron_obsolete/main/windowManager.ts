import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron';
import path from 'path';
import { config, isDevelopment } from './config';
import { logger } from './utils/logger';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private static instance: WindowManager;

  private constructor() {}

  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager();
    }
    return WindowManager.instance;
  }

  public async createMainWindow(): Promise<BrowserWindow> {
    if (this.mainWindow) {
      return this.mainWindow;
    }

    const windowOptions: BrowserWindowConstructorOptions = {
      width: 1200,
      height: 800,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        preload: path.join(__dirname, 'preload.js'),
        sandbox: true,
      },
      titleBarStyle: 'hidden',
      backgroundColor: '#ffffff',
    };

    logger.info('Creating main window with options:', JSON.stringify(windowOptions));
    this.mainWindow = new BrowserWindow(windowOptions);

    // Load the app
    try {
      await this.loadApp();
    } catch (error) {
      logger.error('Failed to load app:', error);
      throw error;
    }

    // Window event handlers
    this.setupWindowHandlers();

    return this.mainWindow;
  }

  private async loadApp(): Promise<void> {
    if (!this.mainWindow) return;

    try {
      if (isDevelopment) {
        logger.info(`Loading development server at ${config.renderer.url}`);
        await this.mainWindow.loadURL(config.renderer.url);
        this.mainWindow.webContents.openDevTools();
      } else {
        const indexPath = path.join(__dirname, '../renderer/index.html');
        logger.info(`Loading production build from ${indexPath}`);
        await this.mainWindow.loadFile(indexPath);
      }
    } catch (error) {
      logger.error('Failed to load application:', error);
      throw error;
    }
  }

  private setupWindowHandlers(): void {
    if (!this.mainWindow) return;

    // Show window when page is ready
    this.mainWindow.on('ready-to-show', () => {
      logger.info('Window ready to show');
      this.mainWindow?.show();
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      logger.info('Main window closed');
      this.mainWindow = null;
    });

    // Handle window focus
    this.mainWindow.on('focus', () => {
      logger.debug('Window focused');
    });

    // Handle window blur
    this.mainWindow.on('blur', () => {
      logger.debug('Window blurred');
    });

    // Handle renderer process crashes
    this.mainWindow.webContents.on('render-process-gone', (_, details) => {
      logger.error('Renderer process crashed:', details);
      // Optionally reload or show an error page
    });

    // Handle unresponsive renderer
    this.mainWindow.on('unresponsive', () => {
      logger.warn('Window is unresponsive');
    });
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  public closeMainWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.close();
      this.mainWindow = null;
    }
  }

  public reloadMainWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.reload();
    }
  }
}

export const windowManager = WindowManager.getInstance();
