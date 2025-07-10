import { ipcMain, IpcMainInvokeEvent, app } from 'electron';
import { logger } from './utils/logger';
import { initializeDatabaseService, DatabaseService } from './database';

type IpcHandler<T = any, R = any> = (event: IpcMainInvokeEvent, data: T) => Promise<R> | R;

interface IpcRoute<T = any, R = any> {
  channel: string;
  handler: IpcHandler<T, R>;
}

export class IpcManager {
  private static instance: IpcManager;
  private routes: Map<string, IpcRoute> = new Map();
  private databaseService!: DatabaseService;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): IpcManager {
    if (!IpcManager.instance) {
      IpcManager.instance = new IpcManager();
    }
    return IpcManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    logger.info('Initializing IPC handlers');
    this.databaseService = await initializeDatabaseService(app);
    this.registerDatabaseHandlers();
    this.registerAppHandlers();
    this.isInitialized = true;
    logger.info('IPC handlers initialized');
  }

  public registerHandler<T, R>(channel: string, handler: IpcHandler<T, R>): void {
    if (this.routes.has(channel)) {
      logger.warn(`IPC handler for channel "${channel}" is already registered. Skipping.`);
      return;
    }

    const route: IpcRoute<T, R> = { channel, handler };
    this.routes.set(channel, route);

    ipcMain.handle(channel, async (event, data) => {
      const requestId = Math.random().toString(36).substring(2, 9);
      logger.debug(`[${requestId}] IPC Request: ${channel}`, data || 'No data');

      try {
        const result = await handler(event, data);
        logger.debug(`[${requestId}] IPC Response: ${channel} (success)`);
        return { success: true, data: result };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`[${requestId}] IPC Error in ${channel}:`, errorMessage);
        return { 
          success: false, 
          error: {
            message: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
            code: (error as any).code
          }
        };
      }
    });

    logger.info(`Registered IPC handler for channel: ${channel}`);
  }

  private registerDatabaseHandlers(): void {
    // Execute SQL query
    this.registerHandler<{ sql: string; params?: any[] }, any>('db:query', async (_, data) => {
      return this.databaseService.query(data.sql, data.params || []);
    });

    // Get document by ID
    this.registerHandler<{ id: string }, any>('db:getDocument', async (_, data) => {
      return this.databaseService.getDocumentByStringId(data.id);
    });

    // Save document
    this.registerHandler<{ document: any }, any>('db:saveDocument', async (_, data) => {
      return this.databaseService.saveDocument(data.document);
    });
  }

  public registerAppHandlers(): void {
    this.registerHandler<undefined, string>('app:getVersion', () => {
      return app.getVersion();
    });

    type AppPathName = 'home' | 'appData' | 'userData' | 'sessionData' | 'temp' | 'exe' | 'module' | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos' | 'recent' | 'logs' | 'crashDumps';
    
    this.registerHandler<{ name: AppPathName }, string>('app:getPath', (_, data) => {
      return app.getPath(data.name);
    });
  }



  public cleanup(): void {
    // Remove all IPC handlers when cleaning up
    for (const channel of this.routes.keys()) {
      ipcMain.removeHandler(channel);
    }
    this.routes.clear();
    logger.info('Cleaned up all IPC handlers');
  }
}

export const ipcManager = IpcManager.getInstance();
