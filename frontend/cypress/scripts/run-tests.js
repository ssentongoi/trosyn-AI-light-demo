#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Configuration
const config = {
  // Base URL for the application
  baseUrl: 'http://localhost:3000',
  
  // API base URL
  apiUrl: 'http://localhost:8000/api',
  
  // Test user credentials
  testUsers: {
    admin: {
      username: 'admin',
      password: 'adminpassword123',
      email: 'admin@example.com'
    },
    user: {
      username: 'testuser',
      password: 'testpassword123',
      email: 'test@example.com'
    }
  },
  
  // Test configuration
  headless: true,  // Set to false to run in headed mode
  browser: 'chrome', // 'chrome', 'firefox', 'edge', or 'electron'
  specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
  
  // Timeouts (in milliseconds)
  defaultCommandTimeout: 10000,
  pageLoadTimeout: 60000,
  requestTimeout: 5000,
  responseTimeout: 30000,
  
  // Video and screenshot settings
  video: true,
  screenshotOnRunFailure: true,
  
  // Environment variables
  env: {
    // Add any environment variables needed for testing
    NODE_ENV: 'test',
    CI: process.env.CI || false,
    
    // Desktop app specific settings
    isDesktop: true,
    
    // API configuration
    apiUrl: 'http://localhost:8000/api',
    
    // Authentication
    auth: {
      admin: {
        email: 'admin@example.com',
        password: 'adminpassword123'
      },
      user: {
        email: 'test@example.com',
        password: 'testpassword123'
      }
    },
    
    // Test data
    testDocument: {
      title: 'Test Document',
      content: 'This is a test document content.',
      tags: ['test', 'cypress']
    }
  }
};

// Create cypress.json if it doesn't exist
const cypressConfigPath = path.join(__dirname, '..', 'cypress.config.js');
if (!fs.existsSync(cypressConfigPath)) {
  console.error('Cypress configuration file not found. Please run Cypress at least once to initialize it.');
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const isHeadless = args.includes('--headless');
const isHeaded = args.includes('--headed');
const browser = args.find(arg => arg.startsWith('--browser='))?.split('=')[1] || config.browser;
const spec = args.find(arg => arg.startsWith('--spec='))?.split('=')[1];
const group = args.find(arg => arg.startsWith('--group='))?.split('=')[1];
const env = args.find(arg => arg.startsWith('--env='))?.split('=')[1];

// Build the Cypress command
let cypressCommand = 'npx cypress run';

// Set headless/headed mode
if (isHeaded) {
  cypressCommand += ' --headed';
} else if (isHeadless) {
  cypressCommand += ' --headless';
}

// Set browser
cypressCommand += ` --browser ${browser}`;

// Set spec if provided
if (spec) {
  cypressCommand += ` --spec "${spec}"`;
}

// Set group if provided
if (group) {
  cypressCommand += ` --group "${group}"`;
}

// Set environment variables
const envVars = [];

// Add config environment variables
Object.entries(config.env).forEach(([key, value]) => {
  if (typeof value === 'object') {
    envVars.push(`${key}=${JSON.stringify(value)}`);
  } else {
    envVars.push(`${key}=${value}`);
  }
});

// Add additional environment variables from command line
if (env) {
  envVars.push(env);
}

if (envVars.length > 0) {
  cypressCommand += ` --env ${envVars.join(',')}`;
}

// Set config values
const configOverrides = [];

// Add config overrides from command line
Object.entries({
  baseUrl: config.baseUrl,
  defaultCommandTimeout: config.defaultCommandTimeout,
  pageLoadTimeout: config.pageLoadTimeout,
  requestTimeout: config.requestTimeout,
  responseTimeout: config.responseTimeout,
  video: config.video,
  screenshotOnRunFailure: config.screenshotOnRunFailure,
  specPattern: config.specPattern
}).forEach(([key, value]) => {
  configOverrides.push(`${key}=${JSON.stringify(value)}`);
});

if (configOverrides.length > 0) {
  cypressCommand += ` --config ${configOverrides.join(',')}`;
}

console.log(`Running Cypress with command: ${cypressCommand}`);

// Run the Cypress command
try {
  // Set environment variables
  process.env.CYPRESS_BASE_URL = config.baseUrl;
  process.env.CYPRESS_API_URL = config.apiUrl;
  
  // Run the command
  execSync(cypressCommand, { stdio: 'inherit' });
  
  console.log('Cypress tests completed successfully');
  process.exit(0);
} catch (error) {
  console.error('Cypress tests failed:', error);
  process.exit(1);
}
