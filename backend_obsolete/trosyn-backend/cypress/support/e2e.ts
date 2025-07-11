// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Global error handler
Cypress.on('uncaught:exception', (err) => {
  console.error('Cypress detected uncaught exception:', err);
  // Return false to prevent Cypress from failing the test
  return false;
});

// Global request timeout
Cypress.config('defaultCommandTimeout', 10000);
Cypress.config('responseTimeout', 30000);

// Add custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to wait for the server to be healthy
       * @example cy.waitForServer()
       */
      waitForServer(): Chainable<Response>;
    }
  }
}

Cypress.Commands.add('waitForServer', () => {
  return cy
    .request({
      url: '/health',
      retryOnStatusCodeFailure: true,
      timeout: 30000,
    })
    .its('status')
    .should('eq', 200);
});
