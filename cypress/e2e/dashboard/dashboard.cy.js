/// <reference types="cypress" />

describe('Dashboard', () => {
  beforeEach(() => {
    // Log in before each test
    cy.loginAsUser('user');
    
    // Mock the dashboard data
    cy.intercept('GET', '/api/dashboard/stats', {
      statusCode: 200,
      body: {
        totalUsers: 42,
        activeUsers: 28,
        totalDocuments: 156,
        storageUsed: 1245789,
        recentActivity: [
          { id: 1, user: 'John Doe', action: 'created', document: 'Project Plan.docx', time: '2025-06-24T10:30:00Z' },
          { id: 2, user: 'Jane Smith', action: 'updated', document: 'Meeting Notes.pdf', time: '2025-06-24T09:15:00Z' },
          { id: 3, user: 'Bob Johnson', action: 'shared', document: 'Budget.xlsx', time: '2025-06-23T16:45:00Z' },
        ],
      },
    }).as('getDashboardStats');
    
    // Visit the dashboard
    cy.visit('/dashboard');
    
    // Wait for the dashboard to load
    cy.wait('@getDashboardStats');
  });

  it('should display the dashboard with all components', () => {
    // Check the page title
    cy.get('h1').should('contain', 'Dashboard');
    
    // Check the stats cards
    cy.get('[data-testid="stat-card"]').should('have.length', 4);
    cy.contains('[data-testid="stat-card"]', 'Total Users').should('contain', '42');
    cy.contains('[data-testid="stat-card"]', 'Active Users').should('contain', '28');
    cy.contains('[data-testid="stat-card"]', 'Total Documents').should('contain', '156');
    cy.contains('[data-testid="stat-card"]', 'Storage Used').should('contain', '1.25 MB');
    
    // Check the recent activity table
    cy.get('table').should('be.visible');
    cy.get('th').should('have.length', 4);
    cy.get('th').eq(0).should('contain', 'User');
    cy.get('th').eq(1).should('contain', 'Action');
    cy.get('th').eq(2).should('contain', 'Document');
    cy.get('th').eq(3).should('contain', 'Time');
    
    // Check the activity rows
    cy.get('tbody tr').should('have.length', 3);
    cy.contains('tr', 'John Doe').should('exist');
    cy.contains('tr', 'created').should('exist');
    cy.contains('tr', 'Project Plan.docx').should('exist');
    
    // Check the sidebar navigation
    cy.get('[data-testid="sidebar"]').should('be.visible');
    cy.get('[data-testid="sidebar"] a').should('have.length.at.least', 5);
    
    // Check the user menu
    cy.get('[data-testid="user-menu"]').should('contain', 'Test User');
  });

  it('should navigate to different sections from the sidebar', () => {
    // Mock the documents page
    cy.intercept('GET', '/api/documents', {
      statusCode: 200,
      body: { documents: [] },
    }).as('getDocuments');
    
    // Click on the Documents link
    cy.contains('[data-testid="sidebar"] a', 'Documents').click();
    cy.url().should('include', '/documents');
    cy.wait('@getDocuments');
    
    // Mock the users page
    cy.intercept('GET', '/api/users', {
      statusCode: 200,
      body: { users: [] },
    }).as('getUsers');
    
    // Click on the Users link
    cy.contains('[data-testid="sidebar"] a', 'Users').click();
    cy.url().should('include', '/users');
    cy.wait('@getUsers');
    
    // Mock the settings page
    cy.intercept('GET', '/api/settings', {
      statusCode: 200,
      body: { settings: {} },
    }).as('getSettings');
    
    // Click on the Settings link
    cy.contains('[data-testid="sidebar"] a', 'Settings').click();
    cy.url().should('include', '/settings');
    cy.wait('@getSettings');
    
    // Go back to the dashboard
    cy.contains('[data-testid="sidebar"] a', 'Dashboard').click();
    cy.url().should('include', '/dashboard');
  });

  it('should display a loading state while fetching data', () => {
    // Mock a slow API response
    cy.intercept('GET', '/api/dashboard/stats', (req) => {
      req.reply((res) => {
        // Delay the response by 2 seconds
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(res.send({
              statusCode: 200,
              body: {
                totalUsers: 42,
                activeUsers: 28,
                totalDocuments: 156,
                storageUsed: 1245789,
                recentActivity: [],
              },
            }));
          }, 2000);
        });
      });
    }).as('getDashboardStatsDelayed');
    
    // Refresh the page
    cy.visit('/dashboard');
    
    // Check for loading state
    cy.get('[data-testid="loading-spinner"]').should('be.visible');
    
    // Wait for the request to complete
    cy.wait('@getDashboardStatsDelayed');
    
    // Check that the loading state is gone
    cy.get('[data-testid="loading-spinner"]').should('not.exist');
    
    // Check that the content is displayed
    cy.get('h1').should('contain', 'Dashboard');
  });

  it('should handle API errors gracefully', () => {
    // Mock a failed API request
    cy.intercept('GET', '/api/dashboard/stats', {
      statusCode: 500,
      body: { message: 'Internal server error' },
    }).as('getDashboardStatsError');
    
    // Refresh the page
    cy.visit('/dashboard');
    
    // Wait for the request to complete
    cy.wait('@getDashboardStatsError');
    
    // Check for error message
    cy.get('.MuiAlert-root')
      .should('be.visible')
      .and('contain', 'Failed to load dashboard data');
    
    // Check that the retry button is visible
    cy.contains('button', 'Retry').should('be.visible');
    
    // Mock a successful response for the retry
    cy.intercept('GET', '/api/dashboard/stats', {
      statusCode: 200,
      body: {
        totalUsers: 42,
        activeUsers: 28,
        totalDocuments: 156,
        storageUsed: 1245789,
        recentActivity: [],
      },
    }).as('getDashboardStatsRetry');
    
    // Click the retry button
    cy.contains('button', 'Retry').click();
    
    // Wait for the retry request to complete
    cy.wait('@getDashboardStatsRetry');
    
    // Check that the error message is gone
    cy.get('.MuiAlert-root').should('not.exist');
    
    // Check that the content is displayed
    cy.get('h1').should('contain', 'Dashboard');
  });

  it('should be accessible', () => {
    // Check for accessibility issues
    cy.checkA11yForPage();
    
    // Check keyboard navigation
    cy.get('body').realPress('Tab');
    cy.focused().should('have.attr', 'href', '/dashboard');
    
    cy.focused().realPress('Tab');
    cy.focused().should('have.attr', 'href', '/documents');
    
    // Continue tabbing through the sidebar
    for (let i = 0; i < 10; i++) {
      cy.focused().realPress('Tab');
    }
    
    // Check that we've reached the user menu
    cy.focused().should('have.attr', 'data-testid', 'user-menu-button');
    
    // Open the user menu
    cy.focused().type('{enter}');
    
    // Check that the menu is open
    cy.get('[role="menu"]').should('be.visible');
    
    // Navigate the menu with keyboard
    cy.focused().realPress('Tab');
    cy.focused().should('have.attr', 'role', 'menuitem').and('contain', 'Profile');
    
    cy.focused().realPress('Tab');
    cy.focused().should('have.attr', 'role', 'menuitem').and('contain', 'Settings');
    
    cy.focused().realPress('Tab');
    cy.focused().should('have.attr', 'role', 'menuitem').and('contain', 'Logout');
    
    // Close the menu
    cy.get('body').type('{esc}');
    
    // Check that the menu is closed
    cy.get('[role="menu"]').should('not.exist');
  });

  it('should be responsive', () => {
    // Test on mobile viewport
    cy.viewport('iphone-6');
    
    // Check that the sidebar is collapsed
    cy.get('[data-testid="sidebar"]').should('have.class', 'MuiDrawer-docked');
    
    // Check that the mobile menu button is visible
    cy.get('[data-testid="mobile-menu-button"]').should('be.visible');
    
    // Open the mobile menu
    cy.get('[data-testid="mobile-menu-button"]').click();
    
    // Check that the sidebar is expanded
    cy.get('[data-testid="sidebar"]').should('not.have.class', 'MuiDrawer-docked');
    
    // Click on a menu item
    cy.contains('[data-testid="sidebar"] a', 'Documents').click();
    
    // Check that the sidebar is collapsed again
    cy.get('[data-testid="sidebar"]').should('have.class', 'MuiDrawer-docked');
    
    // Test on tablet viewport
    cy.viewport('ipad-2');
    
    // Check that the sidebar is visible by default
    cy.get('[data-testid="sidebar"]').should('be.visible');
    
    // Test on desktop viewport
    cy.viewport(1280, 800);
    
    // Check that the sidebar is visible and expanded
    cy.get('[data-testid="sidebar"]').should('be.visible');
    cy.get('[data-testid="sidebar"]').should('not.have.class', 'MuiDrawer-docked');
  });
});
