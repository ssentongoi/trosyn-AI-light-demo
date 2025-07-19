const { defineConfig } = require('cypress');

module.exports = defineConfig({
  // Setup for end-to-end testing
  e2e: {
    // Base URL for the application
    baseUrl: 'http://localhost:3000',
    
    // Viewport settings for desktop application
    viewportWidth: 1280,
    viewportHeight: 800,
    
    // Test files pattern
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    
    // Support files
    supportFile: 'cypress/support/e2e.js',
    
    // Timeout settings (increased for desktop app testing)
    defaultCommandTimeout: 30000,    // Increased from 10s to 30s
    responseTimeout: 60000,          // Increased from 30s to 60s
    requestTimeout: 30000,           // Increased from 10s to 30s
    pageLoadTimeout: 120000,         // Increased from 60s to 120s
    
    // Screenshot and video settings
    screenshotOnRunFailure: true,
    screenshotsFolder: 'cypress/screenshots',
    video: true,
    videoCompression: 32,
    videosFolder: 'cypress/videos',
    videoUploadOnPasses: false,
    
    // Experimental features
    experimentalSessionAndOrigin: true,
    experimentalStudio: true,        // Enable Cypress Studio
    
    // Node event listeners
    setupNodeEvents(on, config) {
      // Add any necessary plugins or event listeners here
      return config;
    },
    
    // Environment variables
    env: {
      apiUrl: 'http://localhost:8000/api',
      
      // Authentication
      auth: {
        email: 'test@example.com',
        password: 'testpassword123',
      },
      
      // Test data
      testDocument: {
        title: 'Test Document',
        content: 'This is a test document content.',
      },
      
      // Desktop app specific
      isDesktop: true,
      
      // Add other environment variables as needed
    },
    
    // Retry attempts for flaky tests
    retries: {
      runMode: 2,    // Retry failing tests 2 times in 'run' mode
      openMode: 0    // Don't retry in 'open' mode (for development)
    }
  },
  
  // Component testing configuration (optional)
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.js',
  },
  
  // Global configuration
  chromeWebSecurity: false,  // Required for testing in development with self-signed certs
  numTestsKeptInMemory: 5,   // Reduce memory usage
  watchForFileChanges: true, // Auto-reload tests on file changes
  experimentalMemoryManagement: true, // Better memory management for large test suites
});
