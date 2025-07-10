import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';

// This will be replaced with a proper ESM import after initialization
const loadBetterSqlite3 = async () => {
  try {
    const betterSqlite3 = await import('better-sqlite3');
    return betterSqlite3.default;
  } catch (error) {
    console.error('Failed to load better-sqlite3:', error);
    throw error;
  }
};

class DatabaseService {
  private static instance: DatabaseService | null = null;
  private static appInstance: any = null;
  private static dbModule: any = null;
  private static initializationFailed: boolean = false;

  private db: any;
  private dbPath: string;
  private app: any;
  private isInitialized: boolean = false;
  
  /**
   * Execute a raw SQL query with optional parameters
   */
  public query(sql: string, params: any[] = []): any {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const statement = this.db.prepare(sql);
    return params.length > 0 ? statement.all(...params) : statement.all();
  }
  
  /**
   * Get a document by its numeric ID.
   * The 'documents' table uses an INTEGER PRIMARY KEY.
   */
  public getDocument(id: number): any {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db.prepare('SELECT * FROM documents WHERE id = ?').get(id) || null;
  }

  /**
   * Get a document by an ID that may be a string. This is a helper
   * for IPC calls where IDs might be passed as strings.
   */
  public getDocumentByStringId(id: string): any {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      console.error(`Invalid numeric ID provided: ${id}`);
      return null;
    }
    return this.getDocument(numericId);
  }
  
  /**
   * Save a document (insert or replace). Ensures ID is an integer.
   */
  public saveDocument(document: any): any {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const { id, ...docData } = document;
    
    // Ensure ID is a number for the database query
    const numericId = id ? parseInt(id, 10) : null;

    const columns = Object.keys(docData);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(col => docData[col]);
    
    const query = numericId
      ? `INSERT OR REPLACE INTO documents (id, ${columns.join(', ')}) VALUES (?, ${placeholders})`
      : `INSERT INTO documents (${columns.join(', ')}) VALUES (${placeholders})`;

    const params = numericId ? [numericId, ...values] : values;
    
    const result = this.db.prepare(query).run(...params);
    
    return { id: numericId || result.lastInsertRowid, ...docData };
  }
  
  // Initialize the database module
  public static async initializeDbModule() {
    if (!this.dbModule) {
      this.dbModule = await loadBetterSqlite3();
    }
    return this.dbModule;
  }

  private constructor(electronApp: any) {
    if (!electronApp || typeof electronApp.getPath !== 'function') {
      throw new Error('Invalid Electron app instance provided to DatabaseService');
    }
    this.app = electronApp;
    this.dbPath = path.join(this.app.getPath('userData'), 'trosyn-ai.db');
    // Initialize the database module and then the database
    DatabaseService.initializeDbModule()
      .then(() => this.initialize())
      .catch(error => {
        console.error('Failed to initialize database module:', error);
        throw error;
      });
  }

  private initialize(): void {
    this.initializeDatabaseConnection();
  }

  private initializeDatabaseConnection(): void {
    try {
      if (!DatabaseService.dbModule) {
        throw new Error('Database module not initialized. Call DatabaseService.initializeDbModule() first.');
      }
      
      // Ensure the directory exists
      fs.ensureDirSync(path.dirname(this.dbPath));
      
      // Open the database with better error handling
      this.db = new (DatabaseService.dbModule)(this.dbPath, { 
        verbose: console.log, 
        fileMustExist: false,
        timeout: 5000
      });
      
      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      
      this.initializeDatabase();
      this.isInitialized = true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to initialize database:', error);
      DatabaseService.initializationFailed = true; // Set failure flag
      this.isInitialized = false; // Explicitly set to false
      throw new Error(`Database initialization failed: ${errorMessage}`);
    }
  }

  public static async getInstanceAsync(electronApp: any = null): Promise<DatabaseService> {
    if (DatabaseService.initializationFailed) {
      throw new Error('Database service has previously failed to initialize. Cannot create a new instance.');
    }

    try {
      const appInstance = electronApp || app;
      
      // If no instance exists or there was an initialization error, create a new one
      if (!DatabaseService.instance || !DatabaseService.instance.isInitialized) {
        await DatabaseService.initializeDbModule();
        DatabaseService.appInstance = appInstance;
        DatabaseService.instance = new DatabaseService(appInstance);
      }
      // If a new app instance is provided, update the instance
      else if (electronApp && DatabaseService.appInstance !== electronApp) {
        await DatabaseService.initializeDbModule();
        DatabaseService.appInstance = appInstance;
        DatabaseService.instance = new DatabaseService(appInstance);
      }
      
      // Wait for initialization to complete
      while (!DatabaseService.instance.isInitialized) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      return DatabaseService.instance;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to get database instance:', error);
      throw new Error(`Failed to initialize database: ${errorMessage}`);
    }
  }
  
  /**
   * Execute a database operation with error handling and retry logic
   */
  private executeWithRetry<T>(operation: () => T, maxRetries: number = 3): T {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.db) {
          throw new Error('Database is not initialized. Cannot perform operation.');
        }
        return operation();
      } catch (error: unknown) {
        const dbError = error as { code?: string; message: string };
        lastError = error instanceof Error ? error : new Error('Unknown database error');
        
        console.error(`Database operation failed (attempt ${attempt}/${maxRetries}):`, error);
        
        // If the database is locked, wait a bit before retrying
        if (dbError.code === 'SQLITE_BUSY' || dbError.code === 'SQLITE_LOCKED') {
          const delay = Math.min(100 * Math.pow(2, attempt - 1), 1000);
          console.log(`Retrying after ${delay}ms...`);
          this.close();
          this.initializeDatabaseConnection();
          
          // Simple delay without SharedArrayBuffer which requires special context
          const start = Date.now();
          while (Date.now() - start < delay) { /* wait */ }
          
          continue;
        }
        
        // For other errors, break the retry loop
        break;
      }
    }
    
    throw lastError || new Error('Unknown database error');
  }
  
  /**
   * Close the database connection
   */
  public close(): void {
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
        this.isInitialized = false;
      }
    } catch (error) {
      console.error('Error closing database:', error);
    }
  }

  private initializeDatabase(): void {
    this.executeWithRetry(() => {
      // Create tables if they don't exist
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          metadata TEXT
        );

        CREATE TABLE IF NOT EXISTS file_paths (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_id INTEGER NOT NULL,
          file_path TEXT NOT NULL UNIQUE,
          last_modified DATETIME,
          FOREIGN KEY (document_id) REFERENCES documents (id)
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);
      
      // Create indexes for better performance
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_file_paths_path ON file_paths(file_path);
        CREATE INDEX IF NOT EXISTS idx_documents_updated ON documents(updated_at);
      `);
      
      return true;
    });
  }

  public getDatabase() {
    return this.db;
  }

  /**
   * Create a new document
   * @param docData DocumentData object containing document properties
   */
  public createDocument(docData: any): number {
    try {
      // Extract properties from docData
      const { title, content, metadata = '{}', filePath = null } = docData;
      const stats = docData.stats || { mtime: new Date(), size: 0 };
      
      // Parse metadata to ensure it's valid JSON
      const meta = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      const metadataStr = JSON.stringify(meta);
      
      const stmt = this.db.prepare(
        'INSERT INTO documents (title, content, metadata, filePath, lastModified, size, ino, dev) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );
      const result = stmt.run(
        title, 
        content, 
        metadataStr,
        filePath,
        stats.mtime?.toISOString() || new Date().toISOString(),
        stats.size || 0,
        stats.ino || null,
        stats.dev || null
      );
      return result.lastInsertRowid;
    } catch (error) {
      console.error('Error creating document:', error);
      throw new Error('Failed to create document');
    }
  }



  // Get all documents
  public getAllDocuments(): any[] {
    return this.db.prepare('SELECT * FROM documents ORDER BY updated_at DESC').all();
  }

  // Get document by file path from metadata
  public getDocumentByPath(filePath: string): any {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM documents 
        WHERE json_extract(metadata, '$.path') = ?
        AND (json_extract(metadata, '$.deleted') IS NULL OR json_extract(metadata, '$.deleted') = 0)
        LIMIT 1
      `);
      return stmt.get(filePath);
    } catch (error) {
      console.error('Error getting document by path:', error);
      return null;
    }
  }

  public updateDocument(id: number, updates: { title?: string; content?: string; metadata?: string }): boolean {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    // Add fields to update
    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }

    if (updates.content !== undefined) {
      fields.push('content = ?');
      values.push(updates.content);
    }

    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(updates.metadata);
    }

    // If no fields to update, return false
    if (fields.length === 0) {
      return false;
    }

    // Always update the updated_at timestamp
    fields.push('updated_at = CURRENT_TIMESTAMP');
    
    // Add the WHERE clause parameter
    values.push(id);

    try {
      const stmt = this.db.prepare(
        `UPDATE documents SET ${fields.join(', ')} WHERE id = ?`
      );
      const result = stmt.run(...values);
      return result.changes > 0;
    } catch (error) {
      console.error(`Error updating document ${id}:`, error);
      return false;
    }
  }

  public deleteDocument(id: number) {
    const stmt = this.db.prepare('DELETE FROM documents WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
}

// Export the class for testing and manual instantiation
export { DatabaseService };

// For main process usage
let dbService: DatabaseService | null = null;

export async function initializeDatabaseService(electronApp: any = null): Promise<DatabaseService> {
  if (!dbService) {
    dbService = await DatabaseService.getInstanceAsync(electronApp);
  }
  return dbService;
}

// For backward compatibility
const dbServicePromise = initializeDatabaseService();

export { dbServicePromise };

// For backward compatibility
module.exports = {
  DatabaseService,
  initializeDatabaseService,
  get dbService() {
    if (!dbService) {
      throw new Error('Database service not initialized. Call initializeDatabaseService() first.');
    }
    return dbService;
  },
  async getDbServiceAsync() {
    if (!dbService) {
      dbService = await dbServicePromise;
    }
    return dbService;
  }
};
