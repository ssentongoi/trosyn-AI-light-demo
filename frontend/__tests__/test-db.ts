// Test database operations
const { app } = require('electron');
const path = require('path');
const { dbService } = require('../dist/main/database');

async function testDatabase() {
  // Mock app.getPath
  if (!app.getPath) {
    app.getPath = (name: string) => {
      if (name === 'userData') {
        return path.join(__dirname, 'test-data');
      }
      return path.join(process.cwd(), 'test-data', name);
    };
  }
  try {
    console.log('Testing database operations...');
    
    // Test creating a document
    console.log('Creating test document...');
    const docId = dbService.createDocument(
      'Test Document', 
      '# Hello World\nThis is a test document.',
      JSON.stringify({ author: 'Test User', tags: ['test', 'demo'] })
    );
    
    console.log(`Created document with ID: ${docId}`);
    
    // Test retrieving the document
    console.log('Retrieving document...');
    const doc = dbService.getDocument(docId);
    console.log('Retrieved document:', doc);
    
    // Test updating the document
    console.log('Updating document...');
    const updated = dbService.updateDocument(docId, {
      title: 'Updated Test Document',
      content: '# Updated Content\nThis is the updated content.',
      metadata: JSON.stringify({ author: 'Test User', tags: ['test', 'demo', 'updated'] })
    });
    
    console.log('Update successful:', updated);
    
    // Test retrieving all documents
    console.log('Retrieving all documents...');
    const allDocs = dbService.getAllDocuments();
    console.log('All documents:', allDocs);
    
    // Test deleting the document
    console.log('Deleting document...');
    const deleted = dbService.deleteDocument(docId);
    console.log('Delete successful:', deleted);
    
    // Verify deletion
    const remainingDocs = dbService.getAllDocuments();
    console.log(`Documents remaining: ${remainingDocs.length}`);
    
    console.log('Database tests completed successfully!');
    
  } catch (error) {
    console.error('Database test failed:', error);
    process.exit(1);
  }
}

testDatabase().catch(console.error);
