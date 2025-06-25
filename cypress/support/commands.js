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

// Test setup commands
Cypress.Commands.add('resetTestDatabase', () => {
  cy.request('POST', 'http://localhost:8000/api/v1/testing/reset-db');
});

Cypress.Commands.add('logout', () => {
  // Mock the logout API call if needed
  cy.intercept('POST', '/api/auth/logout', {
    statusCode: 200,
    body: { success: true },
  }).as('logoutRequest');

  // Click the logout button (adjust the selector as needed)
  cy.get('[data-testid="user-menu"]').click();
  cy.contains('Logout').click();

  // Wait for the logout request to complete
  cy.wait('@logoutRequest');
});

// Form Commands
Cypress.Commands.add('fillFormField', (field, value) => {
  const normalizedField = field.toLowerCase().replace(/\s+/g, '-');
  cy.get(`[data-testid="${normalizedField}-field"]`).clear().type(value);
  return cy.get(`[data-testid="${normalizedField}-field"]`);
});

// Navigation Commands
Cypress.Commands.add('navigateTo', (menuItem) => {
  // Click the sidebar toggle if it's collapsed
  cy.get('body').then(($body) => {
    if ($body.find('.sidebar-collapsed').length) {
      cy.get('[data-testid="sidebar-toggle"]').click();
    }
  });
  
  // Click the menu item
  cy.contains(menuItem).click();
});

// Table Commands
Cypress.Commands.add('getTableRow', (rowIndex) => {
  return cy.get(`[data-testid="table-row-${rowIndex}"]`);
});

Cypress.Commands.add('getTableHeader', (headerText) => {
  return cy.contains('[role="columnheader"]', headerText);
});

// Modal Commands
Cypress.Commands.add('openModal', (modalTestId) => {
  cy.get(`[data-testid="${modalTestId}-button"]`).click();
  return cy.get(`[data-testid="${modalTestId}-modal"]`);
});

Cypress.Commands.add('closeModal', (modalTestId) => {
  return cy.get(`[data-testid="${modalTestId}-close"]`).click();
});

// Notification Commands
Cypress.Commands.add('verifyNotification', (text, type = 'success') => {
  cy.get(`[data-testid="notification-${type}"]`).should('contain', text);
});

// File Upload
Cypress.Commands.add('uploadFile', (selector, fileName, fileType = '') => {
  cy.fixture(fileName, 'base64').then((fileContent) => {
    const blob = Cypress.Blob.base64StringToBlob(fileContent, fileType);
    const testFile = new File([blob], fileName, { type: fileType });
    const dataTransfer = new DataTransfer();
    
    dataTransfer.items.add(testFile);
    cy.get(selector).then(($input) => {
      $input[0].files = dataTransfer.files;
      $input[0].dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
});

// API Helpers
Cypress.Commands.add('mockApiResponse', (method, url, response, status = 200) => {
  cy.intercept(method, url, {
    statusCode: status,
    body: response,
  }).as(`${method.toLowerCase()}${url.replace(/[^a-zA-Z0-9]/g, '')}`);
});

// Local Storage
Cypress.Commands.add('setLocalStorage', (key, value) => {
  cy.window().then((win) => {
    win.localStorage.setItem(key, JSON.stringify(value));
  });
});

Cypress.Commands.add('getLocalStorage', (key) => {
  cy.window().then((win) => {
    const item = win.localStorage.getItem(key);
    try {
      return item ? JSON.parse(item) : null;
    } catch (e) {
      return item;
    }
  });
});

// Session Management
Cypress.Commands.add('preserveAuth', () => {
  Cypress.Cookies.preserveOnce('session_id', 'remember_token');
});

// Accessibility Testing
Cypress.Commands.add('checkA11y', () => {
  cy.injectAxe();
  cy.checkA11y();
});

// Network Utilities
Cypress.Commands.add('waitForNetworkIdle', (method = 'GET', pattern = '*', timeout = 5000) => {
  cy.intercept(method, pattern).as('networkIdle');
  cy.wait('@networkIdle', { timeout });
});

// Form Validation
Cypress.Commands.add('checkFormValidation', (field, errorMessage) => {
  cy.get(`[data-testid="${field}-field"]`)
    .parent()
    .should('have.class', 'Mui-error')
    .find('.MuiFormHelperText-root')
    .should('contain', errorMessage);
});

// Date/Time Helpers
Cypress.Commands.add('setDatePicker', (selector, date) => {
  const dateObj = new Date(date);
  const formattedDate = dateObj.toISOString().split('T')[0];
  cy.get(selector).type(formattedDate);
});

// Table Helpers
Cypress.Commands.add('getTableCell', (row, column) => {
  return cy.get(`[data-testid="table-row-${row}"] td`).eq(column);
});

// Custom Assertions
chai.use((_chai, utils) => {
  const assert = _chai.assert;
  
  // Check if element has CSS class
  assert.hasClass = function(el, className, msg) {
    new _chai.Assertion(el, msg).to.have.class(className);
  };
  
  // Check if element is visible
  assert.isVisible = function(el, msg) {
    new _chai.Assertion(el, msg).to.be.visible;
  };
  
  // Check if element is hidden
  assert.isHidden = function(el, msg) {
    new _chai.Assertion(el, msg).to.be.hidden;
  };
});

// Custom Selectors
Cypress.SelectorPlayground.defaults({
  selectorPriority: [
    'data-testid',
    'data-cy',
    'data-test',
    'id',
    'class',
    'attributes',
    'nth-child',
  ],
});

// Error handling
Cypress.on('uncaught:exception', (err) => {
  // Ignore specific errors
  if (
    err.message.includes('ResizeObserver loop') ||
    err.message.includes('ResizeObserver loop limit exceeded') ||
    err.message.includes('Request failed with status code')
  ) {
    return false;
  }
  // Log other errors
  console.error('Uncaught exception:', err);
  return true;
});

// Performance monitoring
Cypress.on('log:added', (options) => {
  if (options.instrument === 'command' && options.consoleProps) {
    const { name, message } = options;
    const duration = options.consoleProps.Duration;
    
    if (duration > 1000) {
      cy.log(`⚠️  Slow command: ${name} - ${message} (${duration}ms)`);
    }
  }
});

// Custom logging
Cypress.Commands.overwrite('log', (originalFn, message) => {
  const log = Cypress.log({
    displayName: 'LOG',
    message: message,
    name: 'custom',
  });
  
  // Output to console as well
  console.log(`[Cypress Log] ${message}`);
  
  return log;
});

// Custom error messages
Cypress.on('fail', (error, runnable) => {
  // Add custom error handling here
  console.error('Test failed:', error.message);
  throw error; // still fail the test
});
