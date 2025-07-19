/// <reference types="cypress" />

// Custom command for setting up import/export test data
Cypress.Commands.add('setupImportExportTest', () => {
  // Create a test user
  const testUser = {
    username: 'importexportuser',
    password: 'testpassword123',
    email: 'importexport@example.com'
  };

  // Register the test user
  cy.request('POST', 'http://localhost:8000/api/auth/register', {
    username: testUser.username,
    email: testUser.email,
    password: testUser.password
  });

  // Login to get auth token
  return cy.request('POST', 'http://localhost:8000/api/auth/login', {
    username: testUser.username,
    password: testUser.password
  }).then((response) => {
    const token = response.body.access_token;
    
    // Create a test document
    return cy.request({
      method: 'POST',
      url: 'http://localhost:8000/api/documents',
      body: {
        title: 'Test Document for Export',
        content: 'This is a test document for export functionality.',
        tags: ['test', 'export']
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }).then((docResponse) => {
      return {
        user: { ...testUser, token },
        document: docResponse.body
      };
    });
  });
});

describe('Document Import and Export', () => {
  let testData;
  
  before(() => {
    // Setup test data before all tests
    cy.setupImportExportTest().then((data) => {
      testData = data;
    });
  });

  beforeEach(() => {
    // Login before each test
    cy.visit('/login');
    cy.get('input[name="username"]').type(testData.user.username);
    cy.get('input[name="password"]').type(testData.user.password);
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
  });

  it('should export a document to a file', () => {
    // Navigate to the document
    cy.visit(`/editor/${testData.document.id}`);
    
    // Stub the file save dialog
    cy.window().then((win) => {
      cy.stub(win, 'showSaveFilePicker').resolves({
        createWritable: () => {
          return {
            write: cy.stub().resolves(),
            close: cy.stub().resolves()
          };
        }
      });
    });
    
    // Click the export button
    cy.get('[data-testid="export-button"]').click();
    
    // Select export format (e.g., Markdown)
    cy.get('[data-testid="export-format-md"]').click();
    
    // Click the export button in the dialog
    cy.get('[data-testid="confirm-export-button"]').click();
    
    // Verify the export was successful
    cy.get('[data-testid="export-success-message"]').should('be.visible');
  });

  it('should import a document from a file', () => {
    // Create a test file to import
    const testFile = new File(
      ['# Imported Document\n\nThis is an imported document.'], 
      'test-import.md', 
      { type: 'text/markdown' }
    );
    
    // Navigate to the documents page
    cy.visit('/documents');
    
    // Click the import button
    cy.get('[data-testid="import-button"]').click();
    
    // Select the test file
    cy.get('[data-testid="file-input"]').selectFile({
      contents: testFile,
      fileName: 'test-import.md',
      mimeType: 'text/markdown'
    }, { force: true });
    
    // Verify the file was selected
    cy.get('[data-testid="file-name"]').should('contain', 'test-import.md');
    
    // Click the import button
    cy.get('[data-testid="confirm-import-button"]').click();
    
    // Verify the document was imported and we're redirected to the editor
    cy.url().should('include', '/editor/');
    cy.get('[data-testid="document-title"]').should('contain', 'Imported Document');
    cy.get('[data-testid="editor-content"]').should('contain', 'This is an imported document.');
  });

  it('should export a document with all formatting preserved', () => {
    // Navigate to the document
    cy.visit(`/editor/${testData.document.id}`);
    
    // Add some formatting to the document
    cy.get('[data-testid="editor-content"]')
      .clear()
      .type('Formatted Document{enter}{enter}');
    
    // Add a heading
    cy.get('[data-testid="format-heading"]').click();
    cy.get('[data-testid="editor-content"]')
      .type('Heading 1{enter}');
    
    // Add some bold text
    cy.get('[data-testid="format-bold"]').click();
    cy.get('[data-testid="editor-content"]')
      .type('Bold text{enter}');
    
    // Add a bullet list
    cy.get('[data-testid="format-bullet-list"]').click();
    cy.get('[data-testid="editor-content"]')
      .type('Item 1{enter}Item 2{enter}Item 3');
    
    // Save the document
    cy.get('[data-testid="save-document-button"]').click();
    cy.get('[data-testid="save-status"]').should('contain', 'Saved');
    
    // Stub the file save dialog
    cy.window().then((win) => {
      cy.stub(win, 'showSaveFilePicker').resolves({
        createWritable: () => ({
          write: cy.stub().callsFake((content) => {
            // Verify the exported content contains our formatting
            expect(content).to.include('Formatted Document');
            expect(content).to.include('# Heading 1');
            expect(content).to.include('**Bold text**');
            expect(content).to.include('- Item 1');
            return Promise.resolve();
          }),
          close: cy.stub().resolves()
        })
      });
    });
    
    // Export the document as Markdown
    cy.get('[data-testid="export-button"]').click();
    cy.get('[data-testid="export-format-md"]').click();
    cy.get('[data-testid="confirm-export-button"]').click();
    
    // Verify the export was successful
    cy.get('[data-testid="export-success-message"]').should('be.visible');
  });

  it('should import a document with complex formatting', () => {
    // Create a test Markdown file with complex formatting
    const markdownContent = [
      '# Complex Document',
      '## With Multiple Headings',
      '',
      'This is a **bold** and *italic* text.',
      '',
      '### Features:',
      '- Item 1',
      '- Item 2',
      '  - Subitem 2.1',
      '  - Subitem 2.2',
      '',
      '```javascript',
      '// Code block',
      'function test() {',
      '  return "Hello, World!";',
      '}',
      '```',
      '',
      '> This is a blockquote',
      '> with multiple lines',
      '',
      '---',
      '',
      'End of document.'
    ].join('\n');
    
    const testFile = new File(
      [markdownContent],
      'complex-document.md',
      { type: 'text/markdown' }
    );
    
    // Navigate to the documents page
    cy.visit('/documents');
    
    // Click the import button
    cy.get('[data-testid="import-button"]').click();
    
    // Select the test file
    cy.get('[data-testid="file-input"]').selectFile({
      contents: testFile,
      fileName: 'complex-document.md',
      mimeType: 'text/markdown'
    }, { force: true });
    
    // Click the import button
    cy.get('[data-testid="confirm-import-button"]').click();
    
    // Verify the document was imported with all formatting
    cy.url().should('include', '/editor/');
    cy.get('[data-testid="document-title"]').should('contain', 'Complex Document');
    
    // Verify the content was imported correctly
    cy.get('[data-testid="editor-content"] h1').should('contain', 'Complex Document');
    cy.get('[data-testid="editor-content"] h2').should('contain', 'With Multiple Headings');
    cy.get('[data-testid="editor-content"] strong').should('contain', 'bold');
    cy.get('[data-testid="editor-content"] em').should('contain', 'italic');
    cy.get('[data-testid="editor-content"] ul li').should('have.length.at.least', 2);
    cy.get('[data-testid="editor-content"] pre').should('contain', 'function test');
    cy.get('[data-testid="editor-content"] blockquote').should('contain', 'This is a blockquote');
  });

  it('should export to multiple formats', () => {
    const formats = [
      { id: 'md', name: 'Markdown', extension: '.md' },
      { id: 'docx', name: 'Word', extension: '.docx' },
      { id: 'pdf', name: 'PDF', extension: '.pdf' },
      { id: 'html', name: 'HTML', extension: '.html' },
      { id: 'txt', name: 'Plain Text', extension: '.txt' }
    ];
    
    // Navigate to the document
    cy.visit(`/editor/${testData.document.id}`);
    
    // Test each export format
    formats.forEach((format) => {
      // Stub the file save dialog
      cy.window().then((win) => {
        cy.stub(win, 'showSaveFilePicker').resolves({
          createWritable: () => ({
            write: cy.stub().resolves(),
            close: cy.stub().resolves()
          })
        });
      });
      
      // Click the export button
      cy.get('[data-testid="export-button"]').click();
      
      // Select the format
      cy.get(`[data-testid="export-format-${format.id}"]`).click();
      
      // Click the export button in the dialog
      cy.get('[data-testid="confirm-export-button"]').click();
      
      // Verify the export was successful
      cy.get('[data-testid="export-success-message"]').should('be.visible');
      
      // Close the success message
      cy.get('[data-testid="close-export-dialog"]').click();
    });
  });

  it('should handle import errors gracefully', () => {
    // Create an invalid file (e.g., corrupted or wrong format)
    const invalidFile = new File(
      ['<invalid><markup>This is not a valid document</markup>'],
      'invalid-file.xml',
      { type: 'application/xml' }
    );
    
    // Navigate to the documents page
    cy.visit('/documents');
    
    // Click the import button
    cy.get('[data-testid="import-button"]').click();
    
    // Select the invalid file
    cy.get('[data-testid="file-input"]').selectFile({
      contents: invalidFile,
      fileName: 'invalid-file.xml',
      mimeType: 'application/xml'
    }, { force: true });
    
    // Verify an error message is shown
    cy.get('[data-testid="import-error-message"]')
      .should('be.visible')
      .and('contain', 'Unsupported file format');
    
    // Verify the import button is disabled
    cy.get('[data-testid="confirm-import-button"]')
      .should('be.disabled');
  });

  it('should show a preview of the document before importing', () => {
    // Create a test Markdown file
    const markdownContent = [
      '# Preview Test',
      'This is a test document for preview.',
      '',
      '## Features',
      '- Preview',
      '- Import',
      '- Export'
    ].join('\n');
    
    const testFile = new File(
      [markdownContent],
      'preview-test.md',
      { type: 'text/markdown' }
    );
    
    // Navigate to the documents page
    cy.visit('/documents');
    
    // Click the import button
    cy.get('[data-testid="import-button"]').click();
    
    // Select the test file
    cy.get('[data-testid="file-input"]').selectFile({
      contents: testFile,
      fileName: 'preview-test.md',
      mimeType: 'text/markdown'
    }, { force: true });
    
    // Verify the preview is shown
    cy.get('[data-testid="import-preview"]').should('be.visible');
    
    // Verify the preview content
    cy.get('[data-testid="import-preview"] h1').should('contain', 'Preview Test');
    cy.get('[data-testid="import-preview"] h2').should('contain', 'Features');
    cy.get('[data-testid="import-preview"] ul li').should('have.length', 3);
    
    // Verify the import button is enabled
    cy.get('[data-testid="confirm-import-button"]')
      .should('be.enabled');
  });

  it('should allow setting document metadata during import', () => {
    // Create a test Markdown file
    const testFile = new File(
      ['# Document with Metadata\n\nThis document has custom metadata.'],
      'metadata-test.md',
      { type: 'text/markdown' }
    );
    
    // Navigate to the documents page
    cy.visit('/documents');
    
    // Click the import button
    cy.get('[data-testid="import-button"]').click();
    
    // Select the test file
    cy.get('[data-testid="file-input"]').selectFile({
      contents: testFile,
      fileName: 'metadata-test.md',
      mimeType: 'text/markdown'
    }, { force: true });
    
    // Set document title
    const newTitle = 'Custom Import Title ' + new Date().getTime();
    cy.get('[data-testid="import-title"]')
      .clear()
      .type(newTitle);
    
    // Add tags
    const tags = ['import', 'test', 'metadata'];
    tags.forEach(tag => {
      cy.get('[data-testid="import-tags"]').type(`${tag}{enter}`);
    });
    
    // Set document language
    cy.get('[data-testid="import-language"]').click();
    cy.get('[data-value="en"]').click();
    
    // Click the import button
    cy.get('[data-testid="confirm-import-button"]').click();
    
    // Verify the document was imported with the custom metadata
    cy.url().should('include', '/editor/');
    cy.get('[data-testid="document-title"]').should('contain', newTitle);
    
    // Verify the tags were added
    tags.forEach(tag => {
      cy.get(`[data-testid="tag-${tag}"]`).should('exist');
    });
    
    // Verify the language was set (if your UI shows this)
    // This would depend on your application's UI
  });
});

// Test for bulk import/export
describe('Bulk Import/Export', () => {
  before(() => {
    // Login before all tests
    cy.loginAsUser('admin');
  });

  it('should export multiple documents as a zip archive', () => {
    // Navigate to the documents page
    cy.visit('/documents');
    
    // Select multiple documents (implementation depends on your UI)
    // This is a simplified example
    cy.get('[data-testid^="select-document-"]').first().click();
    cy.get('[data-testid^="select-document-"]').eq(1).click();
    
    // Click the bulk export button
    cy.get('[data-testid="bulk-export-button"]').click();
    
    // Select export format
    cy.get('[data-testid="bulk-export-format-md"]').click();
    
    // Click the export button
    cy.get('[data-testid="confirm-bulk-export-button"]').click();
    
    // Verify the export was successful
    cy.get('[data-testid="export-success-message"]').should('be.visible');
  });

  it('should import multiple documents from a zip archive', () => {
    // Create a zip file with multiple documents
    // This is a simplified example - in a real test, you'd need to create an actual zip file
    
    // Navigate to the documents page
    cy.visit('/documents');
    
    // Click the bulk import button
    cy.get('[data-testid="bulk-import-button"]').click();
    
    // Select a zip file (implementation depends on your file input)
    // This is a simplified example
    cy.get('[data-testid="bulk-file-input"]').selectFile({
      contents: Cypress.Buffer.from('test'),
      fileName: 'test-import.zip',
      mimeType: 'application/zip'
    }, { force: true });
    
    // Click the import button
    cy.get('[data-testid="confirm-bulk-import-button"]').click();
    
    // Verify the import was successful
    cy.get('[data-testid="import-success-message"]').should('be.visible');
    
    // Verify the documents were imported
    // This would depend on your application's UI
  });
});
