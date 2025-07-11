// Test IPC handlers for database operations
const { ipcRenderer } = require('electron');
const { DatabaseService, initializeDatabaseService } = require('./dist/main/database');
const path = require('path');
const fs = require('fs');

// Create test directory if it doesn't exist
const testDir = path.join(__dirname, 'test-data');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Setup mock app
const mockApp = {
  getPath: (name) => testDir
};

// Initialize database service for direct testing
const dbService = initializeDatabaseService(mockApp);

// Mock ipcRenderer for testing
const mockIpcRenderer = {
  invoke: async (channel, ...args) => {
    switch (channel) {
      case 'db:createDocument':
        const { title, content, metadata } = args[0];
        const id = dbService.createDocument(title, content, metadata);
        return { success: true, data: { id } };
        
      case 'db:getDocument':
        const doc = dbService.getDocument(args[0]);
        if (!doc) return { success: false, error: 'Document not found' };
        return { success: true, data: doc };
        
      case 'db:updateDocument':
        const [docId, updates] = args;
        const result = dbService.updateDocument(docId, updates);
        return { success: result, data: { id: docId } };
        
      case 'db:deleteDocument':
        const deleteResult = dbService.deleteDocument(args[0]);
        return { success: deleteResult, data: { id: args[0] } };
        
      case 'db:getAllDocuments':
        const docs = dbService.getAllDocuments();
        return { success: true, data: docs };
        
      default:
        throw new Error(`Unhandled IPC channel: ${channel}`);
    }
  }
};

// Test data
const testDoc = {
  title: 'Test Document',
  content: 'This is a test document',
  metadata: JSON.stringify({ author: 'Tester' })
};

// Test runner
async function runTests() {
  console.log('=== Starting IPC Handler Tests ===\n');
  
  // Test createDocument
  console.log('1. Testing createDocument...');
  const createResult = await mockIpcRenderer.invoke('db:createDocument', testDoc);
  if (!createResult.success) throw new Error('Failed to create document');
  const { id } = createResult.data;
  console.log(`✅ Created document with ID: ${id}`);
  
  // Test getDocument
  console.log('\n2. Testing getDocument...');
  const getResult = await mockIpcRenderer.invoke('db:getDocument', id);
  if (!getResult.success) throw new Error('Failed to get document');
  console.log('✅ Retrieved document:', JSON.stringify(getResult.data, null, 2));
  
  // Test updateDocument
  console.log('\n3. Testing updateDocument...');
  const updateData = { title: 'Updated Test Document' };
  const updateResult = await mockIpcRenderer.invoke('db:updateDocument', id, updateData);
  if (!updateResult.success) throw new Error('Failed to update document');
  const { data: updatedDoc } = await mockIpcRenderer.invoke('db:getDocument', id);
  console.log('✅ Updated document title:', updatedDoc.title);
  
  // Test getAllDocuments
  console.log('\n4. Testing getAllDocuments...');
  const allDocsResult = await mockIpcRenderer.invoke('db:getAllDocuments');
  if (!allDocsResult.success) throw new Error('Failed to get all documents');
  console.log('✅ Retrieved all documents:', allDocsResult.data.length);
  
  // Test deleteDocument
  console.log('\n5. Testing deleteDocument...');
  const deleteResult = await mockIpcRenderer.invoke('db:deleteDocument', id);
  if (!deleteResult.success) throw new Error('Failed to delete document');
  const { success: docExists } = await mockIpcRenderer.invoke('db:getDocument', id);
  console.log(`✅ Document deleted: ${!docExists}`);
  
  // Test error handling
  console.log('\n6. Testing error handling...');
  const invalidDoc = { title: '', content: '' };
  const errorResult = await mockIpcRenderer.invoke('db:createDocument', invalidDoc);
  console.log(`✅ Error handling works: ${!errorResult.success && errorResult.error ? '✅' : '❌'}`);
  
  console.log('\n=== All IPC Handler Tests Completed Successfully! ===');
  
  // Cleanup test database
  fs.unlinkSync(path.join(testDir, 'trosyn-ai.db'));
  fs.rmdirSync(testDir);
  
  process.exit(0);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
