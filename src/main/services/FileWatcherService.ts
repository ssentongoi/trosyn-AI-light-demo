import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs-extra';
import Database from 'better-sqlite3';
import { app } from 'electron';


interface DocumentMetadata {
  path: string;
  lastModified: string;
  size: number;
  ino?: number;
  dev?: number;
  deleted?: boolean;
  deletedAt?: string;
  [key: string]: any;
}

export class FileWatcherService {
  private watcher: chokidar.FSWatcher | null = null;
  private watchPath: string = '';
  private db: any; // better-sqlite3 Database instance
  private isWatching: boolean = false;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEBOUNCE_DELAY = 1000; // 1 second debounce
  private readonly IGNORED_PATTERNS = [
    /(^|[\/\\])\./, // ignore dotfiles
    '**/node_modules/**',
    '**/.git/**',
    '**/.DS_Store',
    '**/thumbs.db',
    '**/desktop.ini',
    '**/.idea/**',
    '**/.vscode/**',
    '**/*.tmp',
    '**/*.swp',
    '**/*~',
    '**/Thumbs.db',
    '**/ehthumbs.db',
    '**/Desktop.ini',
    '**/desktop.ini',
    '**/com1..com3',
    '**/lpt1..lpt3',
    '**/con',
    '**/nul',
    '**/prn'
  ];

  constructor(db: any) {
    this.db = db;
  }

  /**
   * Check if a file should be ignored based on patterns
   */
  private shouldIgnoreFile(filePath: string): boolean {
    const normalizedPath = path.normalize(filePath).toLowerCase();
    return this.IGNORED_PATTERNS.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(normalizedPath);
      }
      // Convert glob pattern to regex for matching
      const regexPattern = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars
        .replace(/\*\*/g, '.*') // ** matches any number of directories
        .replace(/\*/g, '[^\\/]*'); // * matches any characters except path separators
      
      return new RegExp(`^${regexPattern}$`, 'i').test(normalizedPath);
    });
  }

  /**
   * Clear any pending debounced operation for a file
   */
  private clearDebounce(filePath: string): void {
    const timer = this.debounceTimers.get(filePath);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(filePath);
    }
  }

  /**
   * Debounce file operations to prevent multiple rapid updates
   */
  private debounceOperation(filePath: string, operation: () => Promise<void>): void {
    // Clear any existing timeout for this file
    this.clearDebounce(filePath);

    // Set a new timeout
    const timer = setTimeout(async () => {
      try {
        await operation();
      } catch (error) {
        console.error(`Error in debounced operation for ${filePath}:`, error);
      } finally {
        this.debounceTimers.delete(filePath);
      }
    }, this.DEBOUNCE_DELAY);

    // Store the timer so we can clear it if needed
    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Initialize the file watcher with a directory to watch
   * @param watchPath Directory path to watch for changes
   */
  public async initialize(watchPath: string): Promise<void> {
    console.log(`[FileWatcher] Initializing file watcher for: ${watchPath}`);
    
    if (this.isWatching) {
      console.log('[FileWatcher] Watcher already active, stopping first...');
      await this.stopWatching();
    }

    this.watchPath = path.normalize(watchPath);
    console.log(`[FileWatcher] Normalized watch path: ${this.watchPath}`);
    
    // Ensure the watch directory exists
    await fs.ensureDir(this.watchPath);
    
    console.log('[FileWatcher] Setting up chokidar watcher...');
    
    try {
      this.watcher = chokidar.watch(this.watchPath, {
        ignored: this.IGNORED_PATTERNS,
        persistent: true,
        ignoreInitial: true, // Don't process existing files on startup
        awaitWriteFinish: {
          stabilityThreshold: 1000,
          pollInterval: 100
        },
        usePolling: false,
        interval: 100,
        binaryInterval: 300,
        alwaysStat: true,
        useFsEvents: true // Use native fsevents on macOS for better performance
      });
      
      console.log('[FileWatcher] Chokidar watcher created with options:', {
        watchPath: this.watchPath,
        usePolling: false,
        ignored: this.IGNORED_PATTERNS
      });

      // Set up event listeners
      this.setupEventListeners();
      this.isWatching = true;

      console.log('[FileWatcher] File watcher initialized and running');
    } catch (error) {
      console.error('[FileWatcher] Failed to initialize file watcher:', error);
      throw new Error(`Failed to initialize file watcher: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set up event listeners for file system events
   */
  private setupEventListeners(): void {
    if (!this.watcher) return;

    // File added
    this.watcher.on('add', (filePath: string, stats?: fs.Stats) => {
      console.log(`[FileWatcher] File added: ${filePath}`);
      this.handleFileAdd(filePath, stats).catch(error => {
        console.error(`[FileWatcher] Error handling file add for ${filePath}:`, error);
      });
    });

    // File changed
    this.watcher.on('change', (filePath: string, stats?: fs.Stats) => {
      console.log(`[FileWatcher] File changed: ${filePath}`);
      this.handleFileChange(filePath, stats).catch(error => {
        console.error(`[FileWatcher] Error handling file change for ${filePath}:`, error);
      });
    });

    // File deleted
    this.watcher.on('unlink', (filePath: string) => {
      console.log(`[FileWatcher] File deleted: ${filePath}`);
      this.handleFileDelete(filePath).catch(error => {
        console.error(`[FileWatcher] Error handling file delete for ${filePath}:`, error);
      });
    });

    // Error handling
    this.watcher.on('error', (error: Error) => {
      console.error('[FileWatcher] Error in file watcher:', error);
    });
  }

  /**
   * Handle file addition
   */
  private async handleFileAdd(filePath: string, stats?: fs.Stats): Promise<void> {
    if (this.shouldIgnoreFile(filePath)) {
      console.log(`[FileWatcher] Ignoring file: ${filePath}`);
      return;
    }
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileStats = stats || await fs.stat(filePath);
      const fileName = path.basename(filePath, path.extname(filePath));
      
      // Prepare metadata
      const metadata: DocumentMetadata = {
        path: filePath,
        lastModified: fileStats.mtime.toISOString(),
        size: fileStats.size,
        ino: fileStats.ino,
        dev: fileStats.dev
      };
      
      // Check if file already exists in DB
      const stmt = this.db.prepare('SELECT * FROM documents WHERE file_path = ?');
      const existingDoc = stmt.get(filePath);
      
      if (!existingDoc) {
        // Create new document
        const insertStmt = this.db.prepare(
          'INSERT INTO documents (title, content, file_path, metadata) VALUES (?, ?, ?, ?)'
        );
        
        insertStmt.run(
          fileName,
          content,
          filePath,
          JSON.stringify(metadata)
        );
        
        console.log(`[FileWatcher] Added new document: ${filePath}`);
      } else {
        // Update existing document
        const updateStmt = this.db.prepare(
          'UPDATE documents SET title = ?, content = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        );
        
        const updatedMetadata = JSON.stringify({
          ...(existingDoc.metadata ? JSON.parse(existingDoc.metadata) : {}),
          ...metadata
        });
        
        updateStmt.run(
          fileName,
          content,
          updatedMetadata,
          existingDoc.id
        );
        
        console.log(`[FileWatcher] Updated existing document: ${filePath}`);
      }
    } catch (error) {
      console.error(`[FileWatcher] Error processing file ${filePath}:`, error);
      throw error;
    }
  }
  
  /**
   * Handle file changes with debouncing
   */
  private async handleFileChange(filePath: string, stats?: fs.Stats): Promise<void> {
    if (this.shouldIgnoreFile(filePath)) return;
    
    await this.debounceOperation(filePath, async () => {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const fileStats = stats || await fs.stat(filePath);
        const fileName = path.basename(filePath, path.extname(filePath));
        
        // Get existing document
        const stmt = this.db.prepare('SELECT * FROM documents WHERE file_path = ?');
        const existingDoc = stmt.get(filePath);
        
        if (existingDoc) {
          // Update document content and metadata
          const metadata: DocumentMetadata = {
            path: filePath,
            lastModified: fileStats.mtime.toISOString(),
            size: fileStats.size,
            ...(existingDoc.metadata ? JSON.parse(existingDoc.metadata) : {})
          };
          
          const updateStmt = this.db.prepare(
            'UPDATE documents SET title = ?, content = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
          );
          
          updateStmt.run(
            fileName,
            content,
            JSON.stringify(metadata),
            existingDoc.id
          );
          
          console.log(`[FileWatcher] Updated changed document: ${filePath}`);
        } else {
          // If document doesn't exist in DB, treat as an add
          console.log(`[FileWatcher] Changed file not in DB, treating as add: ${filePath}`);
          await this.handleFileAdd(filePath, fileStats);
        }
      } catch (error) {
        console.error(`[FileWatcher] Error processing file change ${filePath}:`, error);
        throw error;
      }
    });
  }
  
  /**
   * Handle file deletion with debouncing
   */
  private async handleFileDelete(filePath: string): Promise<void> {
    if (this.shouldIgnoreFile(filePath)) return;
    
    // Clear any pending debounced operation
    this.clearDebounce(filePath);
    
    try {
      // Get the document from the database
      const stmt = this.db.prepare('SELECT * FROM documents WHERE file_path = ?');
      const existingDoc = stmt.get(filePath);
      
      if (existingDoc) {
        // Implement soft delete by updating metadata
        const metadata: DocumentMetadata = {
          path: filePath,
          lastModified: new Date().toISOString(),
          size: 0,
          deleted: true,
          deletedAt: new Date().toISOString(),
          ...(existingDoc.metadata ? JSON.parse(existingDoc.metadata) : {})
        };
        
        const updateStmt = this.db.prepare(
          'UPDATE documents SET metadata = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        );
        
        updateStmt.run(
          JSON.stringify(metadata),
          existingDoc.id
        );
        
        console.log(`[FileWatcher] Marked document as deleted: ${filePath}`);
      }
    } catch (error) {
      console.error(`[FileWatcher] Error processing file deletion ${filePath}:`, error);
      throw error;
    }
  }
  
  /**
   * Stop watching for file changes and clean up resources
   */
  public async stopWatching(): Promise<void> {
    if (!this.watcher) return;
    
    try {
      // Clear all debounce timers
      this.debounceTimers.forEach((timer) => clearTimeout(timer));
      this.debounceTimers.clear();
      
      // Close the watcher
      await this.watcher.close();
      this.watcher = null;
      this.isWatching = false;
      
      console.log('[FileWatcher] File watcher stopped');
    } catch (error) {
      console.error('[FileWatcher] Error stopping file watcher:', error);
      throw error;
    }
  }

  /**
   * Get the current watch path
   */
  public getWatchPath(): string {
    return this.watchPath;
  }

  /**
   * Check if the watcher is active
   */
  public isActive(): boolean {
    return this.isWatching;
  }
}

// Create and export singleton instance
let fileWatcherServiceInstance: FileWatcherService | null = null;
let fileWatcherServicePromise: Promise<FileWatcherService> | null = null;

// Function to initialize the file watcher service
export async function initializeFileWatcherService(): Promise<FileWatcherService> {
  if (fileWatcherServiceInstance) {
    return fileWatcherServiceInstance;
  }

  if (fileWatcherServicePromise) {
    return fileWatcherServicePromise;
  }

  fileWatcherServicePromise = (async () => {
    let db: any = null;
    try {
      // Ensure userData directory exists
      const userDataPath = app.getPath('userData');
      await fs.ensureDir(userDataPath);
      
      // Set up database path with proper permissions
      const dbPath = path.join(userDataPath, 'trosyn-ai.db');
      
      // Open database with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      let lastError: Error | null = null;
      
      while (retryCount < maxRetries) {
        try {
          // Configure database with better concurrency settings
          db = new Database(dbPath, {
            verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
            timeout: 5000, // 5 second timeout
            fileMustExist: false
          });
          
          // Configure WAL mode and other pragmas for better concurrency
          db.pragma('journal_mode = WAL');
          db.pragma('synchronous = NORMAL');
          db.pragma('journal_size_limit = 10000'); // 10MB WAL file size limit
          db.pragma('busy_timeout = 5000'); // 5 second busy timeout
          
          // Enable foreign key constraints
          db.pragma('foreign_keys = ON');
          
          // Create tables if they don't exist within a transaction
          db.transaction(() => {
            db.exec(`
              CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT,
                file_path TEXT UNIQUE,
                metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              );
              
              CREATE INDEX IF NOT EXISTS idx_documents_file_path ON documents(file_path);
              CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at);
            `);
          })();
          
          // If we get here, the database was initialized successfully
          break;
          
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          retryCount++;
          
          // Close the database connection if it was opened
          if (db) {
            try { db.close(); } catch (e) { /* ignore */ }
            db = null;
          }
          
          // If we've exhausted our retries, throw the last error
          if (retryCount >= maxRetries) {
            throw new Error(`Failed to initialize database after ${maxRetries} attempts: ${lastError.message}`);
          }
          
          // Wait before retrying (exponential backoff)
          const delay = 100 * Math.pow(2, retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      if (!db) {
        throw new Error('Failed to initialize database: Unknown error');
      }
      
      const service = new FileWatcherService(db);
      fileWatcherServiceInstance = service;
      return service;
    } catch (error) {
      console.error('Failed to initialize FileWatcherService:', error);
      throw error;
    }
  })();

  return fileWatcherServicePromise;
}

// For backward compatibility
export const fileWatcherService = {
  get instance(): FileWatcherService {
    if (!fileWatcherServiceInstance) {
      throw new Error('FileWatcherService not initialized. Call initializeFileWatcherService() first.');
    }
    return fileWatcherServiceInstance;
  }
};

// Auto-initialize if in main process
if (process.type === 'browser') {
  initializeFileWatcherService().catch(console.error);
}
