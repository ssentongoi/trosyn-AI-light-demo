// Simple test script for FileWatcherService (CommonJS version)
const fs = require('fs-extra');
const path = require('path');

// Import the built files using CommonJS require
const { DatabaseService } = require('../dist/main/DatabaseService');
const { FileWatcherService } = require('../dist/main/services/FileWatcherService');

// Configuration
const testDir = path.join(__dirname, '../test-temp');

async function runTest() {
  console.log('Starting FileWatcherService test...');
  
  try {
    // Clean up any previous test directory
    if (fs.existsSync(testDir)) {
      await fs.remove(testDir);
    }
    await fs.mkdirp(testDir);
    
    // Initialize services
    const dbService = new DatabaseService();
    await dbService.initialize();
    
    const fileWatcher = new FileWatcherService(dbService);
    
    // Add debug event listeners
    fileWatcher.on('add', (filePath) => console.log(`File added: ${filePath}`));
    fileWatcher.on('change', (filePath) => console.log(`File changed: ${filePath}`));
    fileWatcher.on('unlink', (filePath) => console.log(`File removed: ${filePath}`));
    fileWatcher.on('error', (error) => console.error('File watcher error:', error));
    
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
    
    if (files && files.length > 0) {
      console.log('✅ Test passed: File was added to the database');
      console.log('File record:', files[0]);
    } else {
      console.error('❌ Test failed: File was not added to the database');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  } finally {
    // Clean up
    if (fs.existsSync(testDir)) {
      await fs.remove(testDir);
    }
    process.exit(0);
  }
}

runTest();
