// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// Custom login command
Cypress.Commands.add('login', (username, password) => {
  // First, try to use API login if possible
  cy.request({
    method: 'POST',
    url: '/api/auth/token',
    body: new URLSearchParams({
      username,
      password,
      grant_type: 'password'
    }).toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    failOnStatusCode: false
  }).then((response) => {
    if (response.status === 200) {
      // If API login is successful, set the token in localStorage
      const { access_token, user } = response.body;
      window.localStorage.setItem('access_token', access_token);
      window.localStorage.setItem('user', JSON.stringify(user));
      return cy.visit('/dashboard');
    }
    
    // Fall back to UI login if API login fails or is not available
    return cy.visit('/login').then(() => {
      cy.get('[data-testid="username-input"]').type(username);
      cy.get('[data-testid="password-input"]').type(password);
      cy.get('[data-testid="login-button"]').click();
    });
  });
});

// Custom logout command
Cypress.Commands.add('logout', () => {
  // Try API logout first
  cy.request({
    method: 'POST',
    url: '/api/auth/logout',
    failOnStatusCode: false
  });
  
  // Clear local storage and cookies
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Visit login page to ensure we're logged out
  return cy.visit('/login');
});

// Command to reset the test database
Cypress.Commands.add('resetDatabase', () => {
  return cy.request('POST', '/api/v1/testing/reset-db');
});

// Command to create a test user
Cypress.Commands.add('createTestUser', (userData) => {
  return cy.request({
    method: 'POST',
    url: '/api/auth/register',
    body: userData,
    failOnStatusCode: false
  });
});

// Command to get the current user
Cypress.Commands.add('getCurrentUser', () => {
  return cy.request({
    method: 'GET',
    url: '/api/auth/me',
    failOnStatusCode: false
  });
});
