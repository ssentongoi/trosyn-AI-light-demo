import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';

// Use dynamic import to avoid TypeScript errors with better-sqlite3
let Database: any;
try {
  Database = require('better-sqlite3');
} catch (error) {
  console.error('Failed to load better-sqlite3:', error);
  throw error;
}

export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private db: any;
  private dbPath: string;
  private isInitialized: boolean = false;

  /**
   * Execute a database operation with retry logic for transient errors
   */
  private executeWithRetry<T>(operation: () => T, maxRetries: number = 3): T {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.db || !this.isInitialized) {
          this.initializeDatabase();
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

  private constructor() {
    this.dbPath = path.join(app.getPath('userData'), 'trosyn-ai.db');
    this.initializeDatabase();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private initializeDatabase(): void {
    try {
      // Ensure the directory exists
      fs.ensureDirSync(path.dirname(this.dbPath));
      
      // Open the database with better error handling
      this.db = new Database(this.dbPath, { 
        verbose: console.log,
        fileMustExist: false,
        timeout: 5000
      });
      
      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      
      this.createTables();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createTables(): void {
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
      
      CREATE INDEX IF NOT EXISTS idx_file_paths_path ON file_paths(file_path);
      CREATE INDEX IF NOT EXISTS idx_documents_updated ON documents(updated_at);
    `);
  }

  public getDatabase() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

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

  // Document management methods
  
  /**
   * Create a new document in the database
   */
  public createDocument(title: string, content: string, filePath: string, metadata: any = {}): number {
    return this.executeWithRetry(() => {
      const stmt = this.db.prepare(
        'INSERT INTO documents (title, content, metadata) VALUES (?, ?, ?)'
      );
      
      const result = stmt.run(title, content, JSON.stringify(metadata));
      const documentId = result.lastInsertRowid as number;
      
      // Also add to file_paths table
      const pathStmt = this.db.prepare(
        'INSERT INTO file_paths (document_id, file_path, last_modified) VALUES (?, ?, CURRENT_TIMESTAMP)'
      );
      pathStmt.run(documentId, filePath);
      
      return documentId;
    });
  }
  
  /**
   * Update an existing document
   */
  public updateDocument(documentId: number, updates: { title?: string; content?: string; metadata?: any }): void {
    this.executeWithRetry(() => {
      const fields: string[] = [];
      const values: (string | number)[] = [];
      
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
        values.push(JSON.stringify(updates.metadata));
      }
      
      if (fields.length === 0) return; // Nothing to update
      
      fields.push('updated_at = CURRENT_TIMESTAMP');
      
      const stmt = this.db.prepare(
        `UPDATE documents SET ${fields.join(', ')} WHERE id = ?`
      );
      
      // Add documentId as the last parameter for the WHERE clause
      const allValues = [...values, documentId];
      stmt.run(...allValues);
      
      return undefined; // Explicitly return void
    });
  }
  
  /**
   * Get a document by its file path
   */
  public getDocumentByPath(filePath: string): any | null {
    return this.executeWithRetry(() => {
      const stmt = this.db.prepare(`
        SELECT d.* FROM documents d
        JOIN file_paths fp ON d.id = fp.document_id
        WHERE fp.file_path = ?
      `);
      
      const doc = stmt.get(filePath);
      if (!doc) return null;
      
      // Parse metadata if it exists
      if (doc.metadata) {
        try {
          doc.metadata = JSON.parse(doc.metadata);
        } catch (e) {
          console.error('Failed to parse document metadata:', e);
          doc.metadata = {};
        }
      }
      
      return doc;
    });
  }
  
  /**
   * Update the last modified time for a file path
   */
  public updateFileModifiedTime(filePath: string): void {
    this.executeWithRetry(() => {
      const stmt = this.db.prepare(
        'UPDATE file_paths SET last_modified = CURRENT_TIMESTAMP WHERE file_path = ?'
      );
      stmt.run(filePath);
    });
  }
  
  /**
   * Get all documents
   */
  public getAllDocuments(): any[] {
    return this.executeWithRetry(() => {
      const stmt = this.db.prepare('SELECT * FROM documents');
      return stmt.all();
    });
  }
}

// Create and export singleton instance
const dbService = DatabaseService.getInstance();

export { dbService };

// For backward compatibility
export default dbService;
