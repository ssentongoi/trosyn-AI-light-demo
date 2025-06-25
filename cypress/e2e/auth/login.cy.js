/// <reference types="cypress" />

describe('Login Page', () => {
  beforeEach(() => {
    cy.resetTestDatabase();
    cy.visit('/login');
    cy.wait(500); // Wait for page to stabilize
    cy.get('[data-testid="login-header"]').should('contain', 'Sign in to your account');
  });

  it('should display the login form', () => {
    cy.get('form').should('be.visible');
    cy.get('input[name="username"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible').and('contain', 'Sign In');
  });

  it('should show an error for invalid credentials', () => {
    cy.get('input[name="username"]').type('wronguser');
    cy.get('input[name="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
    cy.get('[data-testid="error-alert"]').should('be.visible').and('contain', 'Incorrect username or password');
  });

  it('should successfully log in with valid credentials', () => {
    cy.loginAsUser('user');
    cy.url().should('include', '/dashboard');
  });

  it('should navigate to the registration page', () => {
    cy.contains('a', 'Create one').click();
    cy.url().should('include', '/register');
  });
});
