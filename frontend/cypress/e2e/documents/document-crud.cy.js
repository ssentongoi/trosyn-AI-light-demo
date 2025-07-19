/// <reference types="cypress" />

// Custom command for creating a test document
Cypress.Commands.add('createTestDocument', (documentData = {}) => {
  const defaultDocument = {
    title: 'Test Document ' + new Date().getTime(),
    content: 'This is a test document content.',
    tags: ['test', 'cypress']
  };
  
  const document = { ...defaultDocument, ...documentData };
  
  // Use the API to create a document
  return cy.request({
    method: 'POST',
    url: 'http://localhost:8000/api/documents',
    body: document,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${window.localStorage.getItem('access_token')}`
    }
  }).then((response) => {
    expect(response.status).to.equal(201);
    return response.body;
  });
});

describe('Document Management - CRUD Operations', () => {
  const testUser = {
    username: 'docuser',
    password: 'testpassword123',
    email: 'docuser@example.com'
  };

  before(() => {
    // Register and login the test user before all tests
    cy.request('POST', 'http://localhost:8000/api/auth/register', {
      username: testUser.username,
      email: testUser.email,
      password: testUser.password
    });

    // Login via UI
    cy.visit('/login');
    cy.get('input[name="username"]').type(testUser.username);
    cy.get('input[name="password"]').type(testUser.password);
    cy.get('button[type="submit"]').click();
    
    // Wait for login to complete and verify we're on the dashboard
    cy.url().should('include', '/dashboard');
  });

  beforeEach(() => {
    // Preserve the auth token between tests
    Cypress.Cookies.preserveOnce('sessionid', 'csrftoken');
  });

  it('should create a new document', () => {
    const documentTitle = 'Test Document ' + new Date().getTime();
    
    // Navigate to the documents page
    cy.visit('/documents');
    
    // Click the create new document button
    cy.get('[data-testid="create-document-button"]').click();
    
    // Fill in the document form
    cy.get('[data-testid="document-title-input"]').type(documentTitle);
    cy.get('[data-testid="document-content"]').type('This is a test document created by Cypress.');
    
    // Submit the form
    cy.get('[data-testid="save-document-button"]').click();
    
    // Verify the document was created and we're redirected to the editor
    cy.url().should('include', '/editor/');
    cy.get('[data-testid="document-title"]').should('contain', documentTitle);
  });

  it('should view and edit an existing document', () => {
    // First create a test document via API
    cy.createTestDocument().then((doc) => {
      // Navigate to the document
      cy.visit(`/editor/${doc.id}`);
      
      // Verify the document content is displayed
      cy.get('[data-testid="document-title"]').should('be.visible');
      cy.get('[data-testid="editor-content"]').should('contain', doc.content);
      
      // Edit the document
      const updatedContent = 'Updated content at ' + new Date().toISOString();
      cy.get('[data-testid="editor-content"]').clear().type(updatedContent);
      
      // Save the changes
      cy.get('[data-testid="save-document-button"]').click();
      
      // Verify the changes were saved
      cy.get('[data-testid="save-status"]').should('contain', 'Saved');
      
      // Refresh the page to verify persistence
      cy.reload();
      cy.get('[data-testid="editor-content"]').should('contain', updatedContent);
    });
  });

  it('should list all documents', () => {
    // Create a couple of test documents
    cy.createTestDocument({ title: 'Test Doc 1' });
    cy.createTestDocument({ title: 'Test Doc 2' });
    
    // Navigate to the documents list
    cy.visit('/documents');
    
    // Verify the documents are listed
    cy.get('[data-testid="document-list"]').should('be.visible');
    cy.get('[data-testid^="document-item-"]').should('have.length.at.least', 2);
  });

  it('should search and filter documents', () => {
    const uniqueTerm = 'searchtest' + new Date().getTime();
    
    // Create a document with a unique term
    cy.createTestDocument({
      title: `Document with ${uniqueTerm} in title`,
      content: 'This document should be found in search',
      tags: [uniqueTerm]
    });
    
    // Navigate to documents and search
    cy.visit('/documents');
    cy.get('[data-testid="search-input"]').type(uniqueTerm);
    
    // Verify search results
    cy.get('[data-testid^="document-item-"]').should('have.length.at.least', 1);
    cy.get('[data-testid^="document-item-"]').first().should('contain', uniqueTerm);
    
    // Test tag filtering
    cy.get(`[data-testid="tag-${uniqueTerm}"]`).click();
    cy.get('[data-testid^="document-item-"]').should('have.length.at.least', 1);
  });

  it('should delete a document', () => {
    // Create a test document to delete
    cy.createTestDocument({ title: 'Document to be deleted' }).then((doc) => {
      // Navigate to the document
      cy.visit(`/editor/${doc.id}`);
      
      // Open the document menu
      cy.get('[data-testid="document-menu-button"]').click();
      
      // Click delete and confirm
      cy.get('[data-testid="delete-document-button"]').click();
      cy.get('[data-testid="confirm-delete-button"]').click();
      
      // Verify redirection to documents list
      cy.url().should('include', '/documents');
      
      // Verify the document is no longer in the list
      cy.get(`[data-testid="document-item-${doc.id}"]`).should('not.exist');
    });
  });

  // Test for offline document editing if supported
  it('should support offline document editing', () => {
    // This test would need to be implemented based on your app's offline capabilities
    // It would typically involve:
    // 1. Creating/editing a document while online
    // 2. Going offline
    // 3. Making changes while offline
    // 4. Verifying changes are synced when back online
    cy.log('Offline document editing test would be implemented here');
  });
});

// Test for document versioning
describe('Document Versioning', () => {
  let testDocument;
  
  before(() => {
    // Create a test document
    cy.createTestDocument({
      title: 'Version Test Document',
      content: 'Initial version'
    }).then((doc) => {
      testDocument = doc;
    });
  });

  it('should create a new version when document is edited', () => {
    cy.visit(`/editor/${testDocument.id}`);
    
    // Make an edit
    const updatedContent = 'Updated version at ' + new Date().toISOString();
    cy.get('[data-testid="editor-content"]').clear().type(updatedContent);
    
    // Save the changes
    cy.get('[data-testid="save-document-button"]').click();
    cy.get('[data-testid="save-status"]').should('contain', 'Saved');
    
    // Open version history
    cy.get('[data-testid="version-history-button"]').click();
    
    // Verify the version history contains the new version
    cy.get('[data-testid^="version-item-"]').should('have.length.at.least', 2);
  });

  it('should restore a previous version', () => {
    // First, get the current versions
    cy.request({
      method: 'GET',
      url: `http://localhost:8000/api/documents/${testDocument.id}/versions`,
      headers: {
        'Authorization': `Bearer ${window.localStorage.getItem('access_token')}`
      }
    }).then((response) => {
      const versions = response.body.versions;
      const firstVersionId = versions[0].id;
      
      // Restore the first version
      cy.visit(`/documents/${testDocument.id}/versions`);
      
      // Find and click the restore button for the first version
      cy.get(`[data-testid="restore-version-${firstVersionId}"]`).click();
      
      // Confirm the restore
      cy.get('[data-testid="confirm-restore-button"]').click();
      
      // Verify we're redirected back to the editor
      cy.url().should('include', `/editor/${testDocument.id}`);
      
      // Verify the content was restored
      cy.get('[data-testid="editor-content"]').should('contain', 'Initial version');
    });
  });
});
