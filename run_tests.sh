#!/bin/bash
# Set the correct PATH for Node.js
export PATH="/usr/local/bin:$PATH"

# Navigate to the frontend directory
cd /Users/ssentongoivan/CascadeProjects/trosyn-ai/src/frontend

echo "Node.js version:"
node --version
echo "npm version:"
npm --version

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
  npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
fi

# Run Jest tests
echo "Running tests..."
npx jest --passWithNoTests
