// ***********************************************
// This example support/e2e.js is processed and
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
// ***********************************************

// Import commands.js using ES2015 syntax:
import './commands';
import 'cypress-axe';
import 'cypress-real-events/support';
import 'cypress-file-upload';
import 'cypress-wait-until';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  if (
    err.message.includes('ResizeObserver') ||
    err.message.includes('requestAnimationFrame') ||
    err.message.includes('Error: Request failed with status code')
  ) {
    return false;
  }
  // Log the error for debugging
  console.error('Uncaught exception:', err);
  return true; // Fail the test for other errors
});

// Global before each test
beforeEach(() => {
  // Set viewport
  cy.viewport(1280, 800);
  
  // Clear all cookies and local storage before each test
  cy.clearCookies();
  cy.clearLocalStorage();
});

// Global after each test
afterEach(() => {
  // Take a screenshot on test failure
  if (Cypress.mocha.getRunner().suite.ctx.currentTest.state === 'failed') {
    const testTitle = Cypress.mocha.getRunner().suite.ctx.currentTest.title;
    const sanitizedTitle = testTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const screenshotName = `${Cypress.spec.name}/${sanitizedTitle} (failed)`;
    
    cy.screenshot(screenshotName, { capture: 'runner' });
  }
  
  // Log test completion
  Cypress.log({
    name: 'Test Complete',
    message: `Completed: ${Cypress.currentTest.title}`,
    consoleProps: () => ({
      'Test Title': Cypress.currentTest.title,
      'Test State': Cypress.mocha.getRunner().suite.ctx.currentTest.state,
      'Test Duration': Cypress.mocha.getRunner().suite.ctx.currentTest.duration,
    }),
  });
});

// Custom commands for common test scenarios
Cypress.Commands.add('loginAsUser', (userType = 'user') => {
  const users = {
    admin: {
      username: 'admin',
      password: 'password123',
    },
    user: {
      username: 'user',
      password: 'password123',
    },
  };

  const user = users[userType];

  cy.visit('/login');

  cy.get('input[name="username"]').type(user.username);
  cy.get('input[name="password"]').type(user.password);
  cy.get('button[type="submit"]').click();

  cy.url().should('include', '/dashboard');
});

// Command to reset the test database
Cypress.Commands.add('resetTestDatabase', () => {
  cy.request('POST', `${Cypress.env('apiUrl')}/test/reset-database`);
});

// Command to create test data
Cypress.Commands.add('createTestData', (fixture) => {
  cy.fixture(fixture).then((data) => {
    cy.request('POST', `${Cypress.env('apiUrl')}/test/create-test-data`, data);
  });
});

// Command to check for accessibility issues
Cypress.Commands.add('checkA11yForPage', () => {
  // Inject axe-core runtime
  cy.injectAxe();
  
  // Check for accessibility violations
  cy.checkA11y(
    // Context to check (defaults to the whole page)
    null,
    // Options for axe.run
    {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'best-practice'],
      },
      rules: {
        // Disable specific rules if needed
        'color-contrast': { enabled: false },
        'landmark-one-main': { enabled: false },
        'page-has-heading-one': { enabled: false },
        'region': { enabled: false },
      },
    },
    // Callback function to handle violations
    (violations) => {
      // Log violations to the console
      violations.forEach((violation) => {
        const nodes = violation.nodes.map((node) => {
          return {
            target: node.target,
            html: node.html,
            failureSummary: node.failureSummary,
          };
        });
        
        // Log the violation
        cy.log(
          `[${violation.impact}] ${violation.help} (${violation.id})`,
          nodes
        );
      });
    },
    // Skip failures (set to false to fail tests on violations)
    true
  );
});

// Command to wait for all API requests to complete
Cypress.Commands.add('waitForAll', (requestAliases, options = {}) => {
  const { timeout = 10000 } = options;
  const aliases = Array.isArray(requestAliases) ? requestAliases : [requestAliases];
  
  aliases.forEach((alias) => {
    cy.wait(alias, { timeout });
  });
});

// Command to check if an element is in viewport
Cypress.Commands.add('isInViewport', (selector) => {
  cy.get(selector).then(($el) => {
    // Get the viewport dimensions
    const viewportWidth = Cypress.config('viewportWidth');
    const viewportHeight = Cypress.config('viewportHeight');
    
    // Get the element's position and dimensions
    const rect = $el[0].getBoundingClientRect();
    
    // Check if the element is within the viewport
    expect(rect.top).to.be.within(0, viewportHeight);
    expect(rect.bottom).to.be.within(0, viewportHeight);
    expect(rect.left).to.be.within(0, viewportWidth);
    expect(rect.right).to.be.within(0, viewportWidth);
  });
});

// Command to check if an element is scrollable
Cypress.Commands.add('isScrollable', (selector) => {
  cy.get(selector).then(($el) => {
    expect($el[0].scrollHeight).to.be.greaterThan($el[0].clientHeight);
  });
});

// Command to scroll an element into view, ensuring a top offset
Cypress.Commands.overwrite('scrollIntoView', (originalFn, subject, options) => {
  const mergedOptions = {
    ...options,
    offset: { top: -100, left: 0 },
  };
  return originalFn(subject, mergedOptions);
});

// Command to wait for all images to load
Cypress.Commands.add('waitForImages', () => {
  cy.get('img').each(($img) => {
    cy.wrap($img).should('be.visible').and(($img) => {
      expect($img[0].naturalWidth).to.be.greaterThan(0);
      expect($img[0].naturalHeight).to.be.greaterThan(0);
    });
  });
});

// Command to check if an element has a specific CSS class
Cypress.Commands.add('hasClass', (selector, className) => {
  cy.get(selector).should('have.class', className);
});

// Command to check if an element does not have a specific CSS class
Cypress.Commands.add('doesNotHaveClass', (selector, className) => {
  cy.get(selector).should('not.have.class', className);
});

// Command to check if an element is visible
Cypress.Commands.add('isVisible', (selector) => {
  cy.get(selector).should('be.visible');
});

// Command to check if an element is hidden
Cypress.Commands.add('isHidden', (selector) => {
  cy.get(selector).should('not.be.visible');
});

// Command to check if an element is disabled
Cypress.Commands.add('isDisabled', (selector) => {
  cy.get(selector).should('be.disabled');
});

// Command to check if an element is enabled
Cypress.Commands.add('isEnabled', (selector) => {
  cy.get(selector).should('be.enabled');
});

// Command to check if an element exists in the DOM
Cypress.Commands.add('exists', (selector) => {
  cy.get(selector).should('exist');
});

// Command to check if an element does not exist in the DOM
Cypress.Commands.add('doesNotExist', (selector) => {
  cy.get(selector).should('not.exist');
});
