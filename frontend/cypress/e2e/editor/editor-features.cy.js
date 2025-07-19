/// <reference types="cypress" />

// Custom command for setting up editor test data
Cypress.Commands.add('setupEditorTest', () => {
  // Create a test user
  const testUser = {
    username: 'editortestuser',
    password: 'testpassword123',
    email: 'editortest@example.com'
  };

  // Register the test user
  cy.request('POST', 'http://localhost:8000/api/auth/register', {
    username: testUser.username,
    email: testUser.email,
    password: testUser.password
  });

  // Login via API to get auth token
  return cy.request('POST', 'http://localhost:8000/api/auth/login', {
    username: testUser.username,
    password: testUser.password
  }).then((response) => {
    // Store the auth token
    window.localStorage.setItem('access_token', response.body.access_token);
    
    // Create a test document
    return cy.request({
      method: 'POST',
      url: 'http://localhost:8000/api/documents',
      body: {
        title: 'Editor Test Document',
        content: 'Initial content for editor testing',
        tags: ['test', 'editor']
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${response.body.access_token}`
      }
    }).then((docResponse) => {
      return {
        user: testUser,
        document: docResponse.body,
        authToken: response.body.access_token
      };
    });
  });
});

describe('Editor Features', () => {
  let testData;

  before(() => {
    // Setup test data before all tests
    cy.setupEditorTest().then((data) => {
      testData = data;
    });
  });

  beforeEach(() => {
    // Preserve auth token between tests
    Cypress.Cookies.preserveOnce('sessionid', 'csrftoken');
    
    // Visit the editor with the test document
    cy.visit(`/editor/${testData.document.id}`, {
      onBeforeLoad: (win) => {
        // Set the auth token in localStorage for the test
        win.localStorage.setItem('access_token', testData.authToken);
      }
    });
    
    // Wait for the editor to be fully loaded
    cy.get('[data-testid="editor-container"]', { timeout: 10000 }).should('be.visible');
  });

  it('should load the editor with the document content', () => {
    // Verify the document title is displayed
    cy.get('[data-testid="document-title"]').should('be.visible');
    
    // Verify the editor content is loaded
    cy.get('[data-testid="editor-content"]').should('contain', 'Initial content for editor testing');
  });

  it('should allow editing the document title', () => {
    const newTitle = 'Updated Title ' + new Date().getTime();
    
    // Click to edit the title
    cy.get('[data-testid="document-title"]').dblclick();
    
    // Clear and type new title
    cy.get('[data-testid="editable-title-input"]')
      .clear()
      .type(`${newTitle}{enter}`);
    
    // Verify the title was updated
    cy.get('[data-testid="document-title"]').should('contain', newTitle);
    
    // Verify the change was saved
    cy.get('[data-testid="save-status"]').should('contain', 'Saved');
    
    // Refresh to verify persistence
    cy.reload();
    cy.get('[data-testid="document-title"]').should('contain', newTitle);
  });

  it('should format text with basic formatting options', () => {
    // Test bold formatting
    cy.get('[data-testid="format-bold"]').click();
    cy.get('[data-testid="editor-content"]')
      .type('Bold Text')
      .should('have.html', '<strong>Bold Text</strong>');
    
    // Test italic formatting
    cy.get('[data-testid="format-italic"]').click();
    cy.get('[data-testid="editor-content"]')
      .type('{selectall}')
      .type('Italic Text')
      .should('have.html', '<em>Italic Text</em>');
    
    // Test heading formatting
    cy.get('[data-testid="format-heading"]').click();
    cy.get('[data-testid="editor-content"]')
      .type('{selectall}')
      .type('Heading 1')
      .should('have.html', '<h1>Heading 1</h1>');
  });

  it('should insert lists and checkboxes', () => {
    // Insert a bulleted list
    cy.get('[data-testid="format-bullet-list"]').click();
    cy.get('[data-testid="editor-content"]')
      .type('First item{enter}Second item{enter}Third item');
    
    // Verify the list was created
    cy.get('[data-testid="editor-content"] ul').should('have.length', 1);
    cy.get('[data-testid="editor-content"] li').should('have.length', 3);
    
    // Insert a numbered list
    cy.get('[data-testid="format-ordered-list"]').click();
    cy.get('[data-testid="editor-content"]')
      .type('{selectall}')
      .type('Step 1{enter}Step 2{enter}Step 3');
    
    // Verify the numbered list was created
    cy.get('[data-testid="editor-content"] ol').should('have.length', 1);
    
    // Test checkboxes (if supported)
    cy.get('[data-testid="format-checkbox"]').click();
    cy.get('[data-testid="editor-content"]')
      .type('{selectall}')
      .type('Task 1{enter}Task 2');
    
    // Verify checkboxes were inserted
    cy.get('[data-testid="editor-content"] input[type="checkbox"]').should('have.length', 2);
  });

  it('should handle image insertion', () => {
    // This test would need to be implemented based on your image upload functionality
    // It would typically involve:
    // 1. Clicking the image insert button
    // 2. Selecting/uploading an image
    // 3. Verifying the image appears in the editor
    cy.log('Image insertion test would be implemented here');
  });

  it('should support undo/redo functionality', () => {
    const originalContent = 'Original content';
    const updatedContent = 'Updated content';
    
    // Clear and type initial content
    cy.get('[data-testid="editor-content"]')
      .clear()
      .type(originalContent);
    
    // Update the content
    cy.get('[data-testid="editor-content"]')
      .clear()
      .type(updatedContent);
    
    // Verify the update
    cy.get('[data-testid="editor-content"]').should('contain', updatedContent);
    
    // Undo the last change
    cy.get('body').type('{cmd+z}');
    
    // Verify the content was reverted
    cy.get('[data-testid="editor-content"]').should('contain', originalContent);
    
    // Redo the change
    cy.get('body').type('{cmd+shift+z}');
    
    // Verify the content was restored
    cy.get('[data-testid="editor-content"]').should('contain', updatedContent);
  });

  it('should show word and character count', () => {
    const testText = 'This is a test sentence for counting words and characters.';
    
    // Clear and type test text
    cy.get('[data-testid="editor-content"]')
      .clear()
      .type(testText);
    
    // Verify word and character count
    const wordCount = testText.split(/\s+/).filter(word => word.length > 0).length;
    const charCount = testText.length;
    
    cy.get('[data-testid="word-count"]').should('contain', `${wordCount} words`);
    cy.get('[data-testid="char-count"]').should('contain', `${charCount} characters`);
  });

  it('should support document collaboration features', () => {
    // This test would need to be implemented based on your collaboration features
    // It would typically involve:
    // 1. Simulating multiple users
    // 2. Testing real-time updates
    // 3. Testing presence indicators
    // 4. Testing conflict resolution
    cy.log('Collaboration features test would be implemented here');
  });

  it('should handle keyboard shortcuts', () => {
    // Test common keyboard shortcuts
    cy.get('[data-testid="editor-content"]')
      .clear()
      .type('Test bold{selectall}');
    
    // Test Cmd+B for bold (Mac)
    cy.get('body').type('{cmd}b');
    cy.get('[data-testid="editor-content"] strong').should('contain', 'Test bold');
    
    // Test Cmd+I for italic
    cy.get('body').type('{selectall}{cmd}i');
    cy.get('[data-testid="editor-content"] em').should('contain', 'Test bold');
    
    // Test Cmd+Z for undo
    cy.get('body').type('{cmd}z');
    cy.get('[data-testid="editor-content"] em').should('not.exist');
    cy.get('[data-testid="editor-content"] strong').should('contain', 'Test bold');
  });
});

// Test for spell checking and grammar features
describe('Spell Checking and Grammar', () => {
  let testData;

  before(() => {
    // Setup test data
    cy.setupEditorTest().then((data) => {
      testData = data;
    });
  });

  beforeEach(() => {
    // Visit the editor with the test document
    cy.visit(`/editor/${testData.document.id}`, {
      onBeforeLoad: (win) => {
        win.localStorage.setItem('access_token', testData.authToken);
      }
    });
    
    // Wait for the editor to be fully loaded
    cy.get('[data-testid="editor-container"]', { timeout: 10000 }).should('be.visible');
  });

  it('should highlight misspelled words', () => {
    // Type a misspelled word
    cy.get('[data-testid="editor-content"]')
      .clear()
      .type('This is a msspelled word');
    
    // Wait for spell check to complete (implementation dependent)
    cy.wait(1000);
    
    // Verify the misspelled word is highlighted
    cy.get('[data-testid="editor-content"]')
      .find('.misspelled')
      .should('contain', 'msspelled');
  });

  it('should suggest corrections for misspelled words', () => {
    // Right-click on the misspelled word (implementation dependent)
    // This is a simplified example - actual implementation would depend on your editor
    cy.get('[data-testid="editor-content"]')
      .contains('msspelled')
      .rightclick();
    
    // Verify suggestions are shown
    cy.get('[data-testid="spellcheck-suggestions"]')
      .should('be.visible')
      .and('contain', 'misspelled');
    
    // Click on a suggestion
    cy.get('[data-testid="suggestion-misspelled"]').click();
    
    // Verify the word was corrected
    cy.get('[data-testid="editor-content"]')
      .should('contain', 'misspelled')
      .and('not.contain', 'msspelled');
  });

  it('should check grammar and suggest improvements', () => {
    // Type a sentence with a grammar issue
    cy.get('[data-testid="editor-content"]')
      .clear()
      .type('Their is a problem with this sentence.');
    
    // Wait for grammar check to complete (implementation dependent)
    cy.wait(1000);
    
    // Verify the grammar issue is highlighted
    cy.get('[data-testid="editor-content"]')
      .find('.grammar-error')
      .should('contain', 'Their');
    
    // Test accepting a grammar suggestion (implementation dependent)
    cy.get('[data-testid="editor-content"]')
      .contains('Their')
      .rightclick();
    
    cy.get('[data-testid="grammar-suggestion-There"]').click();
    
    // Verify the correction was made
    cy.get('[data-testid="editor-content"]')
      .should('contain', 'There is a problem with this sentence.');
  });
});
