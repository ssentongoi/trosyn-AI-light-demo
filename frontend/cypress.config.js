const { defineConfig } = require('cypress');

module.exports = defineConfig({
  // Setup Node events and configuration
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    screenshotOnRunFailure: true,
    screenshotsFolder: 'cypress/screenshots',
    videosFolder: 'cypress/videos',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    defaultCommandTimeout: 10000,
    responseTimeout: 30000,
    requestTimeout: 10000,
    pageLoadTimeout: 60000,
    experimentalSessionAndOrigin: true,
    setupNodeEvents(on, config) {
      // Implement node event listeners here
      return config;
    },
    env: {
      // Environment variables
      apiUrl: 'http://localhost:8000/api',
      // Add other environment variables as needed
    },
  },
  component: {
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack',
    },
  },
});
