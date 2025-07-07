// Test database operations with enhanced debugging
const path = require('path');
const fs = require('fs');

// Helper function to verify mock app
function verifyMockApp(app) {
  console.log('Verifying mock app...');
  console.log('App type:', typeof app);
  console.log('App keys:', Object.keys(app));
  console.log('getPath type:', typeof app.getPath);
  
  if (typeof app.getPath !== 'function') {
    throw new Error('getPath is not a function on mock app');
  }
  
  const userDataPath = app.getPath('userData');
  console.log('User data path:', userDataPath);
  
  return true;
}

// Create test directory if it doesn't exist
const testDir = path.join(__dirname, 'test-data');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Create a mock app object with enhanced logging
const mockApp = {
  getPath: function(name) {
    console.log(`getPath called with: ${name}`);
    if (name === 'userData') {
      return testDir;
    }
    return path.join(process.cwd(), 'test-data', name);
  }
};

// Verify mock app before using it
console.log('=== Testing mock app ===');
verifyMockApp(mockApp);
console.log('=== Mock app verified ===\n');

// Import the database service
console.log('Importing database service...');
const { DatabaseService, initializeDatabaseService } = require('./dist/main/database');
console.log('DatabaseService imported');

console.log('Initializing database service with mock app...');
let dbService;
try {
  // Initialize the database service with our mock app
  dbService = initializeDatabaseService(mockApp);
  console.log('DatabaseService initialized successfully');
} catch (error) {
  console.error('Failed to initialize DatabaseService:', error);
  process.exit(1);
}

// Helper function to generate large content
function generateLargeContent(sizeMB = 1) {
  const size = sizeMB * 1024 * 1024; // Convert MB to bytes
  return 'x'.repeat(size);
}

// Helper function to test error handling
async function testErrorCase(name, testFn) {
  try {
    console.log(`\n=== Testing: ${name} ===`);
    await testFn();
    console.log(`✅ ${name} - Passed`);
  } catch (error) {
    console.error(`❌ ${name} - Failed:`, error.message);
    throw error;
  }
}

async function testDatabase() {
  try {
    console.log('=== Starting Database Tests ===\n');
    
    // Test 1: Basic CRUD operations
    await testErrorCase('Basic CRUD Operations', async () => {
      // Create
      console.log('Creating test document...');
      const docId = dbService.createDocument(
        'Test Document', 
        '# Hello World\nThis is a test document.',
        JSON.stringify({ author: 'Test User', tags: ['test', 'demo'] })
      );
      
      if (!docId || typeof docId !== 'number') {
        throw new Error('Document ID not returned or invalid');
      }
      
      // Read
      const doc = dbService.getDocument(docId);
      if (!doc || doc.id !== docId) {
        throw new Error('Failed to retrieve the created document');
      }
      
      // Update
      const updateResult = dbService.updateDocument(docId, {
        title: 'Updated Test Document',
        content: '# Updated Content',
        metadata: JSON.stringify({ updated: true })
      });
      
      if (!updateResult) {
        throw new Error('Update operation failed');
      }
      
      // Verify update
      const updatedDoc = dbService.getDocument(docId);
      if (updatedDoc.title !== 'Updated Test Document') {
        throw new Error('Document not updated correctly');
      }
      
      // Delete
      const deleteResult = dbService.deleteDocument(docId);
      if (!deleteResult) {
        throw new Error('Delete operation failed');
      }
      
      // Verify deletion
      const deletedDoc = dbService.getDocument(docId);
      if (deletedDoc) {
        throw new Error('Document still exists after deletion');
      }
    });
    
    // Test 2: Edge cases for createDocument
    await testErrorCase('Create Document Edge Cases', async () => {
      // Test empty title
      try {
        dbService.createDocument('', 'Content', '{}');
        throw new Error('Should not allow empty title');
      } catch (e) {
        // Expected error
      }
      
      // Test very large content
      const largeContent = generateLargeContent(2); // 2MB
      const largeDocId = dbService.createDocument('Large Document', largeContent, '{}');
      const largeDoc = dbService.getDocument(largeDocId);
      if (largeDoc.content.length !== largeContent.length) {
        throw new Error('Large document content was truncated');
      }
      
      // Test SQL injection attempt
      const sqlInjectionTitle = "Test'; DROP TABLE documents; --";
      const safeDocId = dbService.createDocument(sqlInjectionTitle, 'Content', '{}');
      const safeDoc = dbService.getDocument(safeDocId);
      if (safeDoc.title !== sqlInjectionTitle) {
        throw new Error('SQL injection attempt not handled properly');
      }
      
      // Cleanup
      dbService.deleteDocument(largeDocId);
      dbService.deleteDocument(safeDocId);
    });
    
    // Test 3: Edge cases for updateDocument
    await testErrorCase('Update Document Edge Cases', async () => {
      const docId = dbService.createDocument('Update Test', 'Content', '{}');
      
      // Test partial update
      dbService.updateDocument(docId, { title: 'New Title' });
      let doc = dbService.getDocument(docId);
      if (doc.title !== 'New Title' || doc.content !== 'Content') {
        throw new Error('Partial update failed');
      }
      
      // Test invalid document ID
      try {
        dbService.updateDocument(999999, { title: 'Test' });
        throw new Error('Should not update non-existent document');
      } catch (e) {
        // Expected error
      }
      
      // Test with no updates
      try {
        dbService.updateDocument(docId, {});
        throw new Error('Should require at least one field to update');
      } catch (e) {
        // Expected error
      }
      
      // Cleanup
      dbService.deleteDocument(docId);
    });
    
    // Test 4: Concurrent operations
    await testErrorCase('Concurrent Operations', async () => {
      const docIds = [];
      
      // Create multiple documents
      for (let i = 0; i < 10; i++) {
        const docId = dbService.createDocument(
          `Concurrent Doc ${i}`,
          `Content ${i}`,
          JSON.stringify({ index: i })
        );
        docIds.push(docId);
      }
      
      // Verify all were created
      const allDocs = dbService.getAllDocuments();
      if (allDocs.length < 10) {
        throw new Error('Not all documents were created');
      }
      
      // Cleanup
      docIds.forEach(id => dbService.deleteDocument(id));
    });
    
    // Test 5: Data integrity
    await testErrorCase('Data Integrity', async () => {
      const testCases = [
        { title: 'Document with quotes', content: 'This has "quotes"' },
        { title: 'Document with newlines', content: 'Line 1\nLine 2\nLine 3' },
        { title: 'Document with unicode', content: 'こんにちは世界' },
        { title: 'Document with emoji', content: '👋 Hello World 🌍' }
      ];
      
      for (const testCase of testCases) {
        const docId = dbService.createDocument(
          testCase.title,
          testCase.content,
          JSON.stringify({ test: 'data' })
        );
        
        const doc = dbService.getDocument(docId);
        if (doc.title !== testCase.title || doc.content !== testCase.content) {
          throw new Error(`Data integrity check failed for: ${testCase.title}`);
        }
        
        dbService.deleteDocument(docId);
      }
    });
    
    console.log('\n=== All Database Tests Completed Successfully! ===');
    
  } catch (error) {
    console.error('\n❌ Database tests failed:', error);
    process.exit(1);
  }
}

testDatabase().catch(console.error);
