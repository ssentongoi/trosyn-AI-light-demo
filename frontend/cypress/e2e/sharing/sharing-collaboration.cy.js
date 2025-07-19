/// <reference types="cypress" />

// Custom command for setting up collaboration test data
Cypress.Commands.add('setupCollaborationTest', () => {
  // Create test users
  const owner = {
    username: 'owneruser',
    password: 'testpassword123',
    email: 'owner@example.com'
  };
  
  const collaborator = {
    username: 'collabuser',
    password: 'testpassword123',
    email: 'collab@example.com'
  };

  // Register both users
  cy.request('POST', 'http://localhost:8000/api/auth/register', {
    username: owner.username,
    email: owner.email,
    password: owner.password
  });

  cy.request('POST', 'http://localhost:8000/api/auth/register', {
    username: collaborator.username,
    email: collaborator.email,
    password: collaborator.password
  });

  // Login as owner
  return cy.request('POST', 'http://localhost:8000/api/auth/login', {
    username: owner.username,
    password: owner.password
  }).then((response) => {
    const ownerToken = response.body.access_token;
    
    // Create a test document as owner
    return cy.request({
      method: 'POST',
      url: 'http://localhost:8000/api/documents',
      body: {
        title: 'Collaboration Test Document',
        content: 'Initial content for collaboration testing',
        tags: ['test', 'collaboration']
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`
      }
    }).then((docResponse) => {
      // Get collaborator user ID
      return cy.request({
        method: 'GET',
        url: `http://localhost:8000/api/users?username=${collaborator.username}`,
        headers: {
          'Authorization': `Bearer ${ownerToken}`
        }
      }).then((userResponse) => {
        return {
          owner: { ...owner, token: ownerToken },
          collaborator: { ...collaborator, id: userResponse.body.id },
          document: docResponse.body
        };
      });
    });
  });
});

describe('Document Sharing and Collaboration', () => {
  let testData;
  
  before(() => {
    // Setup test data before all tests
    cy.setupCollaborationTest().then((data) => {
      testData = data;
    });
  });

  beforeEach(() => {
    // Login as owner before each test
    cy.visit('/login');
    cy.get('input[name="username"]').type(testData.owner.username);
    cy.get('input[name="password"]').type(testData.owner.password);
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
  });

  it('should share a document with another user', () => {
    // Navigate to the document
    cy.visit(`/editor/${testData.document.id}`);
    
    // Open the share dialog
    cy.get('[data-testid="share-document-button"]').click();
    
    // Enter collaborator's email
    cy.get('[data-testid="share-email-input"]').type(testData.collaborator.email);
    
    // Select permission level
    cy.get('[data-testid="permission-select"]').click();
    cy.get('[data-value="edit"]').click();
    
    // Share the document
    cy.get('[data-testid="share-submit-button"]').click();
    
    // Verify success message
    cy.get('[data-testid="share-success-message"]').should('be.visible');
    
    // Logout and login as collaborator
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="logout-button"]').click();
    
    cy.visit('/login');
    cy.get('input[name="username"]').type(testData.collaborator.username);
    cy.get('input[name="password"]').type(testData.collaborator.password);
    cy.get('button[type="submit"]').click();
    
    // Verify collaborator can see the shared document
    cy.visit('/documents');
    cy.get(`[data-testid="document-item-${testData.document.id}"]`)
      .should('be.visible')
      .and('contain', testData.document.title);
  });

  it('should allow real-time collaboration', () => {
    // This test would simulate multiple users editing the same document
    // Note: This is a simplified example - real implementation would need to handle WebSocket connections
    
    // Open the document as owner
    cy.visit(`/editor/${testData.document.id}`);
    
    // Get the collaborator's token in a way that works with Cypress
    cy.request('POST', 'http://localhost:8000/api/auth/login', {
      username: testData.collaborator.username,
      password: testData.collaborator.password
    }).then((response) => {
      const collaboratorToken = response.body.access_token;
      
      // Make an edit as the collaborator via API
      cy.request({
        method: 'PATCH',
        url: `http://localhost:8000/api/documents/${testData.document.id}`,
        body: {
          content: 'Collaborative edit from collaborator',
          version: 1
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${collaboratorToken}`
        }
      });
    });
    
    // Verify the owner sees the update (polling or WebSocket)
    // This is a simplified example - in a real app, you'd need to handle WebSocket events
    cy.get('[data-testid="editor-content"]')
      .should('contain', 'Collaborative edit from collaborator');
    
    // Make an edit as the owner
    const ownerEdit = 'Owner edit at ' + new Date().toISOString();
    cy.get('[data-testid="editor-content"]')
      .clear()
      .type(ownerEdit);
    
    // Verify the owner's edit is visible
    cy.get('[data-testid="editor-content"]')
      .should('contain', ownerEdit);
      
    // Note: Testing real-time updates would typically require:
    // 1. Setting up a WebSocket connection
    // 2. Simulating multiple users
    // 3. Testing conflict resolution
  });

  it('should show presence indicators for collaborators', () => {
    // This test would verify that presence indicators work correctly
    // Implementation would depend on your presence tracking system
    
    // Open the document
    cy.visit(`/editor/${testData.document.id}`);
    
    // Mock a collaborator joining the document
    cy.window().then((win) => {
      // This is a simplified example - in a real app, you'd use your WebSocket client
      win.dispatchEvent(new CustomEvent('collaborator-joined', {
        detail: {
          userId: testData.collaborator.id,
          username: testData.collaborator.username,
          avatar: null
        }
      }));
    });
    
    // Verify the collaborator's presence is shown
    cy.get(`[data-testid="presence-${testData.collaborator.id}"]`)
      .should('be.visible')
      .and('contain', testData.collaborator.username);
      
    // Mock the collaborator making a selection
    cy.window().then((win) => {
      win.dispatchEvent(new CustomEvent('collaborator-selection', {
        detail: {
          userId: testData.collaborator.id,
          selection: {
            from: 0,
            to: 5,
            text: 'First'
          }
        }
      }));
    });
    
    // Verify the selection is shown in the editor
    cy.get(`[data-testid="selection-${testData.collaborator.id}"]`)
      .should('be.visible');
  });

  it('should show edit history and allow reverting changes', () => {
    // Navigate to the document
    cy.visit(`/editor/${testData.document.id}`);
    
    // Make several edits
    const edits = [
      'First edit',
      'Second edit',
      'Third edit'
    ];
    
    edits.forEach((edit, index) => {
      cy.get('[data-testid="editor-content"]')
        .clear()
        .type(edit);
      
      // Save each edit
      cy.get('[data-testid="save-document-button"]').click();
      cy.get('[data-testid="save-status"]').should('contain', 'Saved');
    });
    
    // Open version history
    cy.get('[data-testid="version-history-button"]').click();
    
    // Verify all versions are listed
    cy.get('[data-testid^="version-item-"]').should('have.length', edits.length + 1); // +1 for initial version
    
    // Revert to the first version
    cy.get('[data-testid^="version-item-0"]')
      .find('[data-testid="restore-version-button"]')
      .click();
    
    // Confirm the revert
    cy.get('[data-testid="confirm-restore-button"]').click();
    
    // Verify we're back on the editor with the restored content
    cy.url().should('include', `/editor/${testData.document.id}`);
    cy.get('[data-testid="editor-content"]')
      .should('contain', edits[0]);
  });

  it('should handle concurrent editing conflicts', () => {
    // This test would simulate a conflict scenario where two users edit the same part of the document
    // Note: This is a simplified example - real implementation would depend on your conflict resolution strategy
    
    // Open the document
    cy.visit(`/editor/${testData.document.id}`);
    
    // Make an edit as the owner
    const ownerEdit = 'Owner edit at ' + new Date().toISOString();
    cy.get('[data-testid="editor-content"]')
      .clear()
      .type(ownerEdit);
    
    // Simulate a conflicting edit from the collaborator
    cy.window().then((win) => {
      win.dispatchEvent(new CustomEvent('remote-edit', {
        detail: {
          content: 'Conflicting edit from collaborator',
          version: 1,
          userId: testData.collaborator.id
        }
      }));
    });
    
    // Verify conflict resolution UI is shown
    cy.get('[data-testid="conflict-resolution-dialog"]')
      .should('be.visible');
    
    // Choose to keep local changes
    cy.get('[data-testid="keep-local-changes"]').click();
    
    // Verify the editor content
    cy.get('[data-testid="editor-content"]')
      .should('contain', ownerEdit);
  });

  it('should show typing indicators for collaborators', () => {
    // Open the document
    cy.visit(`/editor/${testData.document.id}`);
    
    // Simulate a collaborator starting to type
    cy.window().then((win) => {
      win.dispatchEvent(new CustomEvent('collaborator-typing', {
        detail: {
          userId: testData.collaborator.id,
          username: testData.collaborator.username,
          isTyping: true
        }
      }));
    });
    
    // Verify typing indicator is shown
    cy.get(`[data-testid="typing-indicator-${testData.collaborator.id}"]`)
      .should('be.visible')
      .and('contain', `${testData.collaborator.username} is typing`);
    
    // Simulate the collaborator stopping typing
    cy.window().then((win) => {
      win.dispatchEvent(new CustomEvent('collaborator-typing', {
        detail: {
          userId: testData.collaborator.id,
          username: testData.collaborator.username,
          isTyping: false
        }
      }));
    });
    
    // Verify typing indicator is hidden
    cy.get(`[data-testid="typing-indicator-${testData.collaborator.id}"]`)
      .should('not.exist');
  });
});

// Test for comments and annotations
describe('Document Comments and Annotations', () => {
  let testData;
  
  before(() => {
    // Setup test data
    cy.setupCollaborationTest().then((data) => {
      testData = data;
    });
  });

  beforeEach(() => {
    // Login as owner
    cy.visit('/login');
    cy.get('input[name="username"]').type(testData.owner.username);
    cy.get('input[name="password"]').type(testData.owner.password);
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
    
    // Navigate to the test document
    cy.visit(`/editor/${testData.document.id}`);
  });

  it('should add a comment to the document', () => {
    // Select some text
    cy.get('[data-testid="editor-content"]')
      .clear()
      .type('This is some text to comment on');
    
    // Select the word "text"
    cy.get('[data-testid="editor-content"]')
      .type('{selectall}text');
    
    // Click the add comment button
    cy.get('[data-testid="add-comment-button"]').click();
    
    // Type a comment
    const commentText = 'This is a test comment';
    cy.get('[data-testid="comment-input"]').type(commentText);
    
    // Save the comment
    cy.get('[data-testid="save-comment-button"]').click();
    
    // Verify the comment is displayed
    cy.get('[data-testid^="comment-"]')
      .should('be.visible')
      .and('contain', commentText);
      
    // Verify the highlighted text in the editor
    cy.get('[data-testid="editor-content"] .comment-highlight')
      .should('be.visible')
      .and('contain', 'text');
  });

  it('should resolve and hide resolved comments', () => {
    // Add a test comment first
    cy.get('[data-testid="editor-content"]')
      .clear()
      .type('Comment to resolve');
    
    cy.get('[data-testid="editor-content"]')
      .type('{selectall}Comment');
    
    cy.get('[data-testid="add-comment-button"]').click();
    cy.get('[data-testid="comment-input"]').type('This is a test comment to resolve');
    cy.get('[data-testid="save-comment-button"]').click();
    
    // Resolve the comment
    cy.get('[data-testid^="comment-"] [data-testid="resolve-comment-button"]')
      .click();
    
    // Verify the comment is marked as resolved
    cy.get('[data-testid^="comment-"]')
      .should('have.class', 'resolved');
    
    // Toggle show/hide resolved comments
    cy.get('[data-testid="toggle-resolved-comments"]').click();
    
    // Verify resolved comments are hidden
    cy.get('[data-testid^="comment-"].resolved')
      .should('not.be.visible');
  });

  it('should allow replying to comments', () => {
    // Add a test comment
    cy.get('[data-testid="editor-content"]')
      .clear()
      .type('Text with a comment');
    
    cy.get('[data-testid="editor-content"]')
      .type('{selectall}comment');
    
    cy.get('[data-testid="add-comment-button"]').click();
    cy.get('[data-testid="comment-input"]').type('Original comment');
    cy.get('[data-testid="save-comment-button"]').click();
    
    // Add a reply
    cy.get('[data-testid="reply-button"]').click();
    cy.get('[data-testid="reply-input"]').type('This is a reply');
    cy.get('[data-testid="save-reply-button"]').click();
    
    // Verify the reply is displayed
    cy.get('[data-testid^="reply-"]')
      .should('be.visible')
      .and('contain', 'This is a reply');
  });

  it('should show comment threads in the sidebar', () => {
    // Add a few comments
    const comments = [
      { text: 'First comment', reply: 'Reply to first' },
      { text: 'Second comment', reply: 'Reply to second' }
    ];
    
    comments.forEach((comment, index) => {
      cy.get('[data-testid="editor-content"]')
        .clear()
        .type(`Comment ${index + 1}`);
      
      cy.get('[data-testid="editor-content"]')
        .type('{selectall}');
      
      cy.get('[data-testid="add-comment-button"]').click();
      cy.get('[data-testid="comment-input"]').type(comment.text);
      cy.get('[data-testid="save-comment-button"]').click();
      
      // Add a reply
      cy.get('[data-testid="reply-button"]').first().click();
      cy.get('[data-testid="reply-input"]').type(comment.reply);
      cy.get('[data-testid="save-reply-button"]').click();
    });
    
    // Open comments sidebar if not already open
    cy.get('[data-testid="comments-sidebar-toggle"]').click();
    
    // Verify all comments and replies are shown in the sidebar
    comments.forEach(comment => {
      cy.get('[data-testid="comments-sidebar"]')
        .should('contain', comment.text)
        .and('contain', comment.reply);
    });
    
    // Click on a comment in the sidebar and verify it scrolls to the right place
    cy.get('[data-testid^="sidebar-comment-"]').first().click();
    
    // Verify the editor scrolls to the comment
    cy.get('[data-testid^="comment-"].active')
      .should('be.visible');
  });

  it('should show notifications for new comments', () => {
    // This test would verify that users get notified of new comments
    // Implementation would depend on your notification system
    
    // Login as collaborator in a different session
    cy.request('POST', 'http://localhost:8000/api/auth/login', {
      username: testData.collaborator.username,
      password: testData.collaborator.password
    }).then((response) => {
      const collaboratorToken = response.body.access_token;
      
      // Add a comment as the collaborator
      cy.request({
        method: 'POST',
        url: `http://localhost:8000/api/documents/${testData.document.id}/comments`,
        body: {
          text: 'New comment from collaborator',
          selection: {
            from: 0,
            to: 5,
            text: 'Hello'
          }
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${collaboratorToken}`
        }
      });
    });
    
    // Verify the owner sees a notification
    cy.get('[data-testid="notification-badge"]')
      .should('be.visible')
      .and('contain', '1');
    
    // Click the notification
    cy.get('[data-testid="notification-badge"]').click();
    
    // Verify the notification is shown
    cy.get('[data-testid="notification-item"]')
      .should('be.visible')
      .and('contain', 'New comment');
    
    // Click the notification to go to the comment
    cy.get('[data-testid="notification-item"]').first().click();
    
    // Verify we're taken to the comment
    cy.url().should('include', `/editor/${testData.document.id}`);
    cy.get('[data-testid^="comment-"]')
      .should('be.visible')
      .and('contain', 'New comment from collaborator');
  });
});
