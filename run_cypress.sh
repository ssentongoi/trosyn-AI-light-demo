#!/bin/bash
# Set the correct PATH for Node.js
export PATH="/usr/local/bin:$PATH"

# Navigate to the frontend directory
cd /Users/ssentongoivan/CascadeProjects/trosyn-ai/src/frontend

echo "Node.js version:"
node --version
echo "npm version:"
npm --version

# Clean up any existing Cypress installation
echo "Cleaning up any existing Cypress installation..."
npm uninstall cypress
rm -rf ~/Library/Caches/Cypress
rm -rf node_modules/cypress

# Install Cypress with a specific version
echo "Installing Cypress..."
npm install cypress@12.17.4 --save-dev

# Install other dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Run Cypress tests with minimal configuration
echo "Running Cypress tests..."
npx cypress run --browser=chrome --config-file=false --spec "cypress/e2e/auth.cy.js"
