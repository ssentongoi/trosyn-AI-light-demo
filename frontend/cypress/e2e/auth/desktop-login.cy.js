/// <reference types="cypress" />

// Custom command for desktop app login
Cypress.Commands.add('desktopLogin', (username, password) => {
  cy.visit('/login');
  
  // Wait for the login form to be visible
  cy.get('[data-testid="login-form"]', { timeout: 10000 }).should('be.visible');
  
  // Fill in the login form
  cy.get('input[name="username"]').type(username);
  cy.get('input[name="password"]').type(password, { log: false });
  
  // Intercept the login request
  cy.intercept('POST', '/api/auth/login').as('loginRequest');
  
  // Submit the form
  cy.get('button[type="submit"]').click();
  
  // Wait for the login request to complete
  return cy.wait('@loginRequest').then((interception) => {
    // Additional assertions on the response if needed
    expect(interception.response.statusCode).to.be.oneOf([200, 201]);
    
    // Verify successful navigation to dashboard
    cy.url().should('include', '/dashboard');
    
    // Verify user is logged in by checking for user menu or other logged-in elements
    cy.get('[data-testid="user-menu"]').should('be.visible');
  });
});

describe('Desktop Application - Login Flow', () => {
  beforeEach(() => {
    // Reset test database before each test
    cy.resetTestDatabase();
  });

  it('should successfully log in with valid credentials', () => {
    const testUser = {
      username: 'testuser',
      password: 'testpassword123',
      email: 'test@example.com'
    };

    // Register a test user first
    cy.request('POST', 'http://localhost:8000/api/auth/register', {
      username: testUser.username,
      email: testUser.email,
      password: testUser.password
    });

    // Test the login flow
    cy.desktopLogin(testUser.username, testUser.password);

    // Verify session is maintained after page reload
    cy.reload();
    cy.get('[data-testid="user-menu"]').should('be.visible');
  });

  it('should show appropriate error for invalid credentials', () => {
    cy.visit('/login');
    
    // Test with invalid credentials
    cy.get('input[name="username"]').type('nonexistentuser');
    cy.get('input[name="password"]').type('wrongpassword');
    
    // Intercept the login request to verify it fails
    cy.intercept('POST', '/api/auth/login').as('loginRequest');
    cy.get('button[type="submit"]').click();
    
    // Wait for the login request and verify error response
    cy.wait('@loginRequest').then((interception) => {
      expect(interception.response.statusCode).to.equal(401);
    });
    
    // Verify error message is displayed
    cy.get('[data-testid="error-message"]')
      .should('be.visible')
      .and('contain', 'Invalid username or password');
  });

  it('should maintain session after app restart', () => {
    const testUser = {
      username: 'sessiontest',
      password: 'testpassword123',
      email: 'session@test.com'
    };

    // Register a test user
    cy.request('POST', 'http://localhost:8000/api/auth/register', {
      username: testUser.username,
      email: testUser.email,
      password: testUser.password
    });

    // Log in and verify successful login
    cy.desktopLogin(testUser.username, testUser.password);
    
    // Simulate app restart by clearing cookies but keeping local storage
    cy.clearCookies();
    cy.reload();
    
    // Verify user is still logged in (session maintained in local storage)
    cy.get('[data-testid="user-menu"]').should('be.visible');
  });

  it('should redirect to dashboard when already logged in', () => {
    const testUser = {
      username: 'redirecttest',
      password: 'testpassword123',
      email: 'redirect@test.com'
    };

    // Register and log in the test user
    cy.request('POST', 'http://localhost:8000/api/auth/register', {
      username: testUser.username,
      email: testUser.email,
      password: testUser.password
    });

    cy.desktopLogin(testUser.username, testUser.password);
    
    // Try to access login page again
    cy.visit('/login');
    
    // Should be redirected to dashboard
    cy.url().should('include', '/dashboard');
  });
});

// Test for offline login if your app supports it
// This is a placeholder that needs to be implemented based on your offline capabilities
describe('Offline Login', { defaultCommandTimeout: 10000 }, () => {
  it('should allow login with cached credentials when offline', () => {
    // This test would need to be implemented based on your app's offline capabilities
    // It would typically involve:
    // 1. Logging in once while online
    // 2. Simulating offline mode
    // 3. Verifying the app still works with cached credentials
    cy.log('Offline login test would be implemented here');
  });
});
