/// <reference types="cypress" />

// Custom command for login via API
Cypress.Commands.add('loginViaApi', (username, password) => {
  return cy.request('POST', '/api/v1/auth/token', {
    username,
    password,
    grant_type: 'password'
  }).then((response) => {
    // Store tokens in localStorage
    window.localStorage.setItem('access_token', response.body.access_token);
    window.localStorage.setItem('user', JSON.stringify(response.body.user));
    return response;
  });
});

describe('Authentication Flow', () => {
  const testUser = {
    username: `testuser_${Math.floor(Math.random() * 10000)}`,
    email: `test_${Math.floor(Math.random() * 10000)}@example.com`,
    password: 'TestPass123!',
    fullName: 'Test User'
  };

  // Test data for error cases
  const invalidCredentials = {
    username: 'nonexistent',
    password: 'wrongpassword'
  };

  beforeEach(() => {
    // Reset the test database before each test
    cy.request('POST', '/api/v1/testing/reset-db');
    // Clear localStorage
    cy.clearLocalStorage();
    // Visit the login page
    cy.visit('/login');
  });

  it('should register a new user successfully', () => {
    // Test registration UI flow
    cy.get('[data-testid="register-link"]').click();
    
    // Fill out the registration form
    cy.get('[data-testid="username-input"]').type(testUser.username);
    cy.get('[data-testid="email-input"]').type(testUser.email);
    cy.get('[data-testid="password-input"]').type(testUser.password);
    cy.get('[data-testid="confirm-password-input"]').type(testUser.password);
    cy.get('[data-testid="fullname-input"]').type(testUser.fullName);
    
    // Intercept the registration API call
    cy.intercept('POST', '/api/v1/auth/register').as('registerRequest');
    
    // Submit the form
    cy.get('[data-testid="register-button"]').click();
    
    // Wait for the registration request to complete
    cy.wait('@registerRequest').then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
      expect(interception.response.body).to.have.property('id');
      expect(interception.response.body).to.have.property('username', testUser.username);
      expect(interception.response.body).to.have.property('email', testUser.email);
    });
    
    // Should be redirected to dashboard after successful registration
    cy.url().should('include', '/dashboard');
    
    // Verify user is logged in
    cy.get('[data-testid="welcome-message"]').should('contain', testUser.username);
  });
  
  it('should log in with valid credentials', () => {
    // First, register a user via API
    cy.request('POST', '/api/v1/auth/register', {
      username: testUser.username,
      email: testUser.email,
      password: testUser.password,
      full_name: testUser.fullName
    });
    
    // Test login UI flow
    cy.get('[data-testid="username-input"]').type(testUser.username);
    cy.get('[data-testid="password-input"]').type(testUser.password);
    
    // Intercept the login API call
    cy.intercept('POST', '/api/v1/auth/token').as('loginRequest');
    
    // Submit the form
    cy.get('[data-testid="login-button"]').click();
    
    // Wait for the login request to complete
    cy.wait('@loginRequest').then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
      expect(interception.response.body).to.have.property('access_token');
      expect(interception.response.body).to.have.property('token_type', 'bearer');
      expect(interception.response.body).to.have.property('user');
    });
    
    // Should be redirected to dashboard after successful login
    cy.url().should('include', '/dashboard');
    
    // Verify user is logged in
    cy.get('[data-testid="welcome-message"]').should('contain', testUser.username);
  });
  
  it('should show error for invalid login', () => {
    // Test login with invalid credentials
    cy.get('[data-testid="username-input"]').type(invalidCredentials.username);
    cy.get('[data-testid="password-input"]').type(invalidCredentials.password);
    
    // Intercept the login API call
    cy.intercept('POST', '/api/v1/auth/token', {
      statusCode: 401,
      body: {
        detail: "Incorrect username or password"
      }
    }).as('failedLogin');
    
    // Submit the form
    cy.get('[data-testid="login-button"]').click();
    
    // Wait for the login request to complete
    cy.wait('@failedLogin');
    
    // Verify error message is shown
    cy.get('[data-testid="error-message"]').should('be.visible')
      .and('contain', 'Incorrect username or password');
      
    // Should stay on the login page
    cy.url().should('include', '/login');
  });

  it('should fetch current user data via /me endpoint', () => {
    // First, register and login a user via API
    cy.request('POST', '/api/v1/auth/register', {
      username: testUser.username,
      email: testUser.email,
      password: testUser.password,
      full_name: testUser.fullName
    }).then((registerResponse) => {
      // Login to get tokens
      return cy.request('POST', '/api/v1/auth/token', {
        username: testUser.username,
        password: testUser.password,
        grant_type: 'password'
      });
    }).then((loginResponse) => {
      // Set the access token in localStorage
      const token = loginResponse.body.access_token;
      cy.window().then((win) => {
        win.localStorage.setItem('access_token', token);
      });
      
      // Intercept the /me endpoint
      cy.intercept('GET', '/api/v1/auth/me').as('getCurrentUser');
      
      // Visit a protected route that fetches user data
      cy.visit('/profile');
      
      // Wait for the /me request to complete
      cy.wait('@getCurrentUser').then((interception) => {
        expect(interception.response.statusCode).to.eq(200);
        expect(interception.response.body).to.have.property('username', testUser.username);
        expect(interception.response.body).to.have.property('email', testUser.email);
      });
      
      // Verify user data is displayed
      cy.get('[data-testid="user-fullname"]').should('contain', testUser.fullName);
      cy.get('[data-testid="user-email"]').should('contain', testUser.email);
    });
  });
  
  it('should maintain session after page refresh', () => {
    // First, register and login a user via API
    cy.request('POST', '/api/v1/auth/register', {
      username: testUser.username,
      email: testUser.email,
      password: testUser.password,
      full_name: testUser.fullName
    });
    
    // Login via UI
    cy.get('[data-testid="username-input"]').type(testUser.username);
    cy.get('[data-testid="password-input"]').type(testUser.password);
    cy.get('[data-testid="login-button"]').click();
    
    // Verify we're on the dashboard
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="welcome-message"]').should('be.visible');
    
    // Refresh the page
    cy.reload();
    
    // Should still be logged in
    cy.get('[data-testid="welcome-message"]').should('be.visible');
    cy.url().should('include', '/dashboard');
  });
  
  it('should log out successfully', () => {
    // First, register and login a user via API
    cy.request('POST', '/api/v1/auth/register', {
      username: testUser.username,
      email: testUser.email,
      password: testUser.password,
      full_name: testUser.fullName
    });
    
    // Login via UI
    cy.get('[data-testid="username-input"]').type(testUser.username);
    cy.get('[data-testid="password-input"]').type(testUser.password);
    cy.get('[data-testid="login-button"]').click();
    
    // Verify we're logged in
    cy.url().should('include', '/dashboard');
    
    // Click logout
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="logout-button"]').click();
    
    // Should be redirected to login page
    cy.url().should('include', '/login');
    
    // Verify user is logged out by checking protected route
    cy.visit('/dashboard');
    cy.url().should('include', '/login'); // Should redirect to login
  });

  it('should redirect to login when not authenticated', () => {
    // Try to access a protected route directly
    cy.visit('/dashboard');
    
    // Should be redirected to login
    cy.url().should('include', '/login');
  });

  it('should handle invalid login credentials', () => {
    // Attempt to login with invalid credentials
    cy.get('[data-testid="username-input"]').type('nonexistentuser');
    cy.get('[data-testid="password-input"]').type('wrongpassword');
    cy.get('[data-testid="login-button"]').click();
    
    // Should show error message
    cy.get('[data-testid="error-alert"]').should('be.visible')
      .and('contain', 'Incorrect username or password');
  });

  it('should enforce role-based access control', () => {
    // Login as admin (assuming we have an admin user)
    const adminUser = {
      username: 'admin',
      password: 'admin123'
    };
    
    cy.login(adminUser.username, adminUser.password);
    
    // Try to access admin route (should be allowed)
    cy.visit('/admin');
    cy.url().should('include', '/admin');
    
    // Logout admin
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="logout-button"]').click();
    
    // Login as regular user
    cy.login(testUser.username, testUser.password);
    
    // Try to access admin route (should be redirected)
    cy.visit('/admin');
    cy.url().should('not.include', '/admin');
    cy.get('[data-testid="error-message"]').should('contain', 'Unauthorized');
  });
});
