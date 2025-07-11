// @ts-nocheck - Disable TypeScript checking for this file

// Use CommonJS for test files
const { expect } = require('chai');
const fs = require('fs-extra');
const path = require('path');

// Import DatabaseService from the source files directly for testing
const { DatabaseService } = require('../../../src/main/DatabaseService');
const { FileWatcherService } = require('../../../src/main/services/FileWatcherService');

// Add chai plugins if needed
// const chai = require('chai');
// chai.use(require('chai-as-promised'));

describe('FileWatcherService', function() {
  let dbService: DatabaseService;
  let fileWatcher: FileWatcherService;
  let testDir: string;
  
  before(async function() {
    // Create a unique test directory for this test run
    testDir = path.join(__dirname, `test-watch-dir-${Date.now()}`);
    
    try {
      // Create test directory
      await fs.ensureDir(testDir);
      
      // Initialize database service with test database
      const testDbPath = path.join(testDir, 'test-db.sqlite');
      
      // Make sure the database doesn't exist
      if (await fs.pathExists(testDbPath)) {
        await fs.remove(testDbPath);
      }
      
      // Initialize database with test path
      process.env.SQLITE_DB_PATH = testDbPath;
      
      // Reset the database service for testing
      if (dbService) {
        try {
          await dbService.close();
        } catch (error) {
          console.error('Error closing existing database connection:', error);
        }
      }
      // Create a new instance for testing
      // @ts-ignore - Accessing private member for testing
      DatabaseService.instance = null;
      dbService = DatabaseService.getInstance();
      
      // Initialize file watcher with debug logging
      fileWatcher = new FileWatcherService(dbService);
      
      // Add debug event listeners
      fileWatcher.on('add', (path) => console.log('File added:', path));
      fileWatcher.on('change', (path) => console.log('File changed:', path));
      fileWatcher.on('unlink', (path) => console.log('File removed:', path));
      fileWatcher.on('error', (error) => console.error('File watcher error:', error));
    } catch (error) {
      console.error('Error in before hook:', error);
      throw error;
    }
  });
  
  afterEach(async function() {
    if (!testDir) return;
    
    try {
      // Clean up test files
      if (await fs.pathExists(testDir)) {
        const files = await fs.readdir(testDir);
        for (const file of files) {
          if (file !== 'test-db.sqlite') {
            await fs.remove(path.join(testDir, file));
          }
        }
      }
    } catch (err) {
      console.error('Error in afterEach cleanup:', err);
    }
  });
  
  after(async function() {
    // @ts-ignore - this is available in Mocha context
    this.timeout(5000); // Increase timeout for cleanup
    
    // Cleanup file watcher
    if (fileWatcher) {
      try {
        if (typeof fileWatcher.isActive === 'function' && fileWatcher.isActive()) {
          await fileWatcher.stopWatching();
        }
      } catch (err) {
        console.error('Error stopping file watcher:', err);
      }
    }
    
    // Close database connection
    if (dbService) {
      try {
        if (typeof dbService.close === 'function') {
          await dbService.close();
        }
      } catch (err) {
        console.error('Error closing database:', err);
      }
    }
    
    // Clean up test directory
    try {
      if (testDir && await fs.pathExists(testDir)) {
        await fs.remove(testDir);
      }
    } catch (err) {
      console.error('Error cleaning up test directory:', err);
    }
    
    // Reset singleton
    DatabaseService.instance = null;
  });
  
  it('should initialize and start watching a directory', async function() {
    await fileWatcher.initialize(testDir);
    expect(fileWatcher.isActive()).to.be.true;
    expect(fileWatcher.getWatchPath()).to.equal(testDir);
  });
  
  it('should detect new files and add them to the database', async function() {
    this.timeout(10000); // Increased timeout for file system operations
    
    try {
      console.log('Starting file watcher test...');
      
      // Start watching the test directory
      console.log(`Watching directory: ${testDir}`);
      await fileWatcher.watch(testDir);
      
      // Create a test file
      const testFile = path.join(testDir, 'test.txt');
      const testContent = 'Test content';
      
      console.log(`Creating test file: ${testFile}`);
      await fs.writeFile(testFile, testContent);
      
      // Wait for file watcher to process
      console.log('Waiting for file watcher to detect changes...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if the file was added to the database
      console.log('Checking database for file...');
      const files = await dbService.query('SELECT * FROM files WHERE path = ?', [testFile]);
      console.log('Database query results:', files);
      
      expect(files).to.be.an('array');
      expect(files.length).to.be.greaterThan(0);
      
      // Verify file content was stored correctly
      if (files.length > 0) {
        console.log('File record found:', files[0]);
        expect(files[0].path).to.equal(testFile);
      }
    } catch (error) {
      console.error('Test failed with error:', error);
      throw error;
    }
  });
  
  it('should detect file changes and update the database', async function() {
    const testFile = path.join(testDir, 'test.txt');
    const updatedContent = 'Updated content';
    
    // Update test file
    await fs.writeFile(testFile, updatedContent);
    
    // Wait for file watcher to process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if file was updated in the database
    const doc = dbService.getDocumentByPath(testFile);
    expect(doc).to.exist;
    expect(doc?.content).to.equal(updatedContent);
  });
  
  it('should detect file deletions and mark them as deleted in the database', async function() {
    const testFile = path.join(testDir, 'test.txt');
    
    // Delete test file
    await fs.remove(testFile);
    
    // Wait for file watcher to process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if file was marked as deleted in the database
    const doc = dbService.getDocumentByPath(testFile);
    expect(doc).to.exist;
    const metadata = doc?.metadata ? JSON.parse(doc.metadata) : {};
    expect(metadata.deleted).to.be.true;
    expect(metadata.deletedAt).to.exist;
  });
  
  it('should stop watching when stopWatching is called', async function() {
    await fileWatcher.stopWatching();
    expect(fileWatcher.isActive()).to.be.false;
  });
});
