const path = require('path');
const fs = require('fs-extra');

// Interface for document data
interface DocumentData {
  id?: number;
  title: string;
  content: string;
  metadata?: string;
  filePath?: string;
  lastModified?: string;
  size?: number;
  ino?: number;
  dev?: number;
}

/**
 * Database service for handling document storage and retrieval
 */
export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private db: any;
  private dbPath: string;
  private isInitialized: boolean = false;
  private app: any;

  private constructor(appInstance: any) {
    if (!appInstance) {
      throw new Error('App instance is required for DatabaseService');
    }
    this.app = appInstance;
    // Initialize database path
    const userDataPath = this.app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'documents.db');
  }

  /**
   * Get the singleton instance of DatabaseService
   * @param appInstance The Electron app instance
   */
  public static getInstance(appInstance?: any): DatabaseService {
    if (!DatabaseService.instance) {
      if (!appInstance) {
        throw new Error('App instance is required for first-time DatabaseService initialization');
      }
      DatabaseService.instance = new DatabaseService(appInstance);
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize the database connection and create tables if they don't exist
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Ensure the directory exists
      await fs.ensureDir(path.dirname(this.dbPath));
      
      // Import better-sqlite3 dynamically for ESM compatibility
      const betterSqlite3 = await import('better-sqlite3');
      const Database = betterSqlite3.default;
      
      // Open the database
      this.db = new Database(this.dbPath);
      
      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');
      
      // Create tables if they don't exist
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          metadata TEXT DEFAULT '{}',
          filePath TEXT UNIQUE,
          lastModified TEXT,
          size INTEGER,
          ino INTEGER,
          dev INTEGER,
          deleted BOOLEAN DEFAULT 0,
          deletedAt TEXT
        )
      `);
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Get a document by ID
   */
  public getDocument(id: number): DocumentData | null {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    
    const stmt = this.db.prepare('SELECT * FROM documents WHERE id = ? AND deleted = 0');
    return stmt.get(id) || null;
  }

  /**
   * Get a document by file path
   */
  public getDocumentByPath(filePath: string): DocumentData | null {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    
    const stmt = this.db.prepare('SELECT * FROM documents WHERE filePath = ? AND deleted = 0');
    return stmt.get(filePath) || null;
  }

  /**
   * Create a new document
   */
  public createDocument(
    title: string, 
    content: string, 
    metadata: string = '{}',
    filePath?: string,
    stats?: { mtime: Date, size: number, ino?: number, dev?: number }
  ): number {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    
    const stmt = this.db.prepare(`
      INSERT INTO documents (title, content, metadata, filePath, lastModified, size, ino, dev)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      title,
      content,
      metadata,
      filePath || null,
      stats?.mtime?.toISOString() || new Date().toISOString(),
      stats?.size || 0,
      stats?.ino || null,
      stats?.dev || null
    );
    
    return info.lastInsertRowid as number;
  }

  /**
   * Update an existing document
   */
  public updateDocument(
    id: number, 
    updates: Partial<Omit<DocumentData, 'id'>>
  ): boolean {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    
    // Build the SET clause dynamically based on provided updates
    const setClauses: string[] = [];
    const params: any[] = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        setClauses.push(`${key} = ?`);
        params.push(value);
      }
    }
    
    if (setClauses.length === 0) {
      return false; // No updates to make
    }
    
    params.push(id);
    
    const stmt = this.db.prepare(`
      UPDATE documents 
      SET ${setClauses.join(', ')}
      WHERE id = ?
    `);
    
    const result = stmt.run(...params);
    return result.changes > 0;
  }

  /**
   * Delete a document (soft delete)
   */
  public deleteDocument(id: number): boolean {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    
    const stmt = this.db.prepare(`
      UPDATE documents 
      SET deleted = 1, deletedAt = ?
      WHERE id = ?
    `);
    
    const result = stmt.run(new Date().toISOString(), id);
    return result.changes > 0;
  }

  /**
   * Get all non-deleted documents
   */
  public getAllDocuments(): DocumentData[] {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    
    const stmt = this.db.prepare('SELECT * FROM documents WHERE deleted = 0 ORDER BY lastModified DESC');
    return stmt.all();
  }

  /**
   * Search documents by title or content
   */
  public searchDocuments(query: string): DocumentData[] {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    
    const searchTerm = `%${query}%`;
    const stmt = this.db.prepare(`
      SELECT * 
      FROM documents 
      WHERE deleted = 0 
        AND (title LIKE ? OR content LIKE ?) 
      ORDER BY lastModified DESC
    `);
    
    return stmt.all(searchTerm, searchTerm);
  }

  /**
   * Close the database connection
   */
  public close(): void {
    if (this.db) {
      this.db.close();
      this.isInitialized = false;
    }
  }
}

// Export a function to get the database service instance
export function getDatabaseService(appInstance: any) {
  return DatabaseService.getInstance(appInstance);
}
