/// <reference types="cypress" />

describe('Registration Page', () => {
  beforeEach(() => {
    cy.resetTestDatabase();
    cy.visit('/register');
    cy.wait(500); // Wait for page to stabilize
    cy.get('[data-testid="register-header"]').should('contain', 'Create an account');
  });

  it('should display the registration form', () => {
    cy.get('form').should('be.visible');
    cy.get('input[name="username"]').should('be.visible');
    cy.get('input[name="fullName"]').should('be.visible');
    cy.get('input[name="email"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');
    cy.get('input[name="confirmPassword"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible').and('contain', 'Create Account');
  });

  it('should show an error when passwords do not match', () => {
    cy.get('input[name="password"]').type('password123');
    cy.get('input[name="confirmPassword"]').type('password456');
    cy.get('button[type="submit"]').click();
    cy.get('[data-testid="error-alert"]').should('contain', "Passwords don't match");
  });

  it('should successfully register a new user and redirect to login', () => {
    const uniqueId = Date.now();
    const newUser = {
      username: `newuser${uniqueId}`,
      fullName: 'New User',
      email: `new${uniqueId}@example.com`,
      password: 'password123',
    };

    cy.get('input[name="username"]').type(newUser.username);
    cy.get('input[name="fullName"]').type(newUser.fullName);
    cy.get('input[name="email"]').type(newUser.email);
    cy.get('input[name="password"]').type(newUser.password);
    cy.get('input[name="confirmPassword"]').type(newUser.password);
    cy.get('button[type="submit"]').click();

    cy.get('.auth-card h1').should('contain', 'Registration Successful!');
    
    cy.url().should('include', '/login', { timeout: 4000 });
  });

  it('should navigate to the login page when "Sign in" is clicked', () => {
    cy.contains('a', 'Sign in').click();
    cy.url().should('include', '/login');
  });
});
