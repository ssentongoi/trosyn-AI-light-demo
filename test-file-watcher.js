const fs = require('fs-extra');
const path = require('path');

// Test configuration
const TEST_DIR = path.join(process.cwd(), 'test-watch-dir');
const TEST_FILE = 'test-document.txt';

// Ensure test directory exists before initializing services
fs.ensureDirSync(TEST_DIR);

// Initialize services
const mockApp = {
  getPath: () => TEST_DIR
};

// Initialize database service
const { initializeDatabaseService } = require('./dist/main/database');
const dbService = initializeDatabaseService(mockApp);

// Initialize file watcher
const { FileWatcherService } = require('./dist/main/services/FileWatcherService');
const chokidar = require('chokidar');

// Create a test watcher for direct chokidar testing
const testWatcher = chokidar.watch(TEST_DIR, {
  ignored: ['**/node_modules/**', '**/.git/**', '**/.DS_Store'],
  persistent: true,
  ignoreInitial: true,
  usePolling: true,  // Force polling to see if it helps with detection
  interval: 100,
  binaryInterval: 300
});

testWatcher
  .on('ready', () => console.log('[TestWatcher] Ready for changes'))
  .on('add', path => console.log(`[TestWatcher] File added: ${path}`))
  .on('change', path => console.log(`[TestWatcher] File changed: ${path}`))
  .on('unlink', path => console.log(`[TestWatcher] File removed: ${path}`))
  .on('error', error => console.error(`[TestWatcher] Error: ${error}`));

const fileWatcher = new FileWatcherService(dbService);

// Add direct access to watcher for testing
fileWatcher._getWatcher = () => testWatcher;

// Test data
const testContent = 'This is a test document for file watcher';
const updatedContent = 'This is an updated test document';

async function setup() {
  // Create test directory
  await fs.ensureDir(TEST_DIR);
  console.log(`Test directory created at: ${TEST_DIR}`);
  
  // Initialize file watcher
  console.log('Initializing file watcher...');
  await fileWatcher.initialize(TEST_DIR);
  
  // Wait for file watcher to be ready
  console.log('Waiting for file watcher to be ready...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('File watcher initialized and ready');
}

async function runTests() {
  console.log('=== Starting File Watcher Tests ===\n');
  
  try {
    // Test 1: Create a new file
    console.log('1. Testing file creation...');
    const filePath = path.join(TEST_DIR, TEST_FILE);
    
    // First, test direct database operations
    console.log('\n--- Testing direct database operations ---');
    console.log('Creating document directly in database...');
    const docId = dbService.createDocument(
      'Direct Test Document',
      'This is a direct test',
      JSON.stringify({ filePath: filePath, test: 'direct' })
    );
    console.log(`Created document with ID: ${docId}`);
    
    // Verify document was created
    const directDoc = dbService.getDocument(docId);
    console.log('Retrieved document:', {
      id: directDoc.id,
      title: directDoc.title,
      path: JSON.parse(directDoc.metadata || '{}').filePath
    });
    
    // Now test file watcher
    console.log('\n--- Testing file watcher ---');
    console.log(`Creating test file at: ${filePath}`);
    await fs.writeFile(filePath, testContent);
    
    // Manually trigger file processing
    console.log('Manually processing file...');
    await fileWatcher.handleFileAdd(filePath);
    
    // Wait for any async operations
    console.log('Waiting for operations to complete...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check database
    console.log('\n--- Checking database state ---');
    const allDocs = dbService.getAllDocuments();
    console.log(`Found ${allDocs.length} documents in database:`);
    allDocs.forEach((d, i) => {
      const meta = JSON.parse(d.metadata || '{}');
      console.log(`  ${i + 1}. ID: ${d.id}, Title: ${d.title}, Path: ${meta.filePath || 'N/A'}`);
    });
    
    const doc = dbService.getDocumentByPath(filePath);
    if (!doc) {
      console.error('Document not found in database after file creation');
      throw new Error('Document not found in database after creation');
    }
    console.log(`✅ Document created:`, { id: doc.id, title: doc.title, path: JSON.parse(doc.metadata || '{}').filePath });
    
    // Test 2: Update the file
    console.log('\n2. Testing file update...');
    await fs.writeFile(filePath, updatedContent);
    
    // Wait for watcher to process
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Verify update in DB
    const updatedDoc = dbService.getDocument(doc.id);
    if (updatedDoc.content !== updatedContent) {
      throw new Error('Document content not updated in database');
    }
    console.log('✅ Document updated successfully');
    
    // Test 3: Delete the file
    console.log('\n3. Testing file deletion...');
    await fs.unlink(filePath);
    
    // Wait for watcher to process
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Verify deletion in DB
    const deletedDoc = dbService.getDocument(doc.id);
    const metadata = JSON.parse(deletedDoc.metadata || '{}');
    if (!metadata.deleted) {
      throw new Error('Document not marked as deleted in database');
    }
    console.log('✅ Document deletion handled correctly');
    
    console.log('\n=== All File Watcher Tests Passed! ===');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    // Cleanup
    await fileWatcher.stopWatching();
    await fs.remove(TEST_DIR);
  }
}

// Run the tests
async function main() {
  try {
    await setup();
    await runTests();
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

main();
