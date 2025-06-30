#!/bin/bash

# Robust test runner script that uses full paths to Node.js and npm

# Set the full paths to Node.js and npm
NODE_PATH="/usr/local/bin/node"
NPM_PATH="/usr/local/bin/npm"

# Verify Node.js and npm exist
if [ ! -f "$NODE_PATH" ]; then
  echo "Error: Node.js not found at $NODE_PATH"
  echo "Please update the NODE_PATH in this script to point to your Node.js installation"
  exit 1
fi

if [ ! -f "$NPM_PATH" ]; then
  echo "Error: npm not found at $NPM_PATH"
  echo "Please update the NPM_PATH in this script to point to your npm installation"
  exit 1
fi

echo "Using Node.js: $($NODE_PATH --version)"
echo "Using npm: $($NPM_PATH --version)"

# Navigate to the frontend directory
cd /Users/ssentongoivan/CascadeProjects/trosyn-ai/src/frontend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  $NPM_PATH install
  $NPM_PATH install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
  
  # Install Babel dependencies
  $NPM_PATH install --save-dev @babel/core @babel/preset-env @babel/preset-react @babel/plugin-transform-runtime @babel/plugin-proposal-class-properties @babel/plugin-transform-modules-commonjs
fi

# Run Jest tests with the full path to Node.js
NODE_ENV=test $NODE_PATH ./node_modules/.bin/jest --passWithNoTests
