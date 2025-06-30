#!/bin/bash

# Navigate to the frontend directory
cd "$(dirname "$0")/src/frontend" || exit 1

# Set the PATH to include the local node_modules/.bin directory
export PATH="$(pwd)/node_modules/.bin:$PATH"

# Check if node is available
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed or not in PATH"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed or not in PATH"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install || { echo "Failed to install dependencies"; exit 1; }
fi

# Run the tests with verbose output
echo "Running tests..."
npm test -- --verbose --watchAll=false --coverage || {
    echo "Tests failed"
    exit 1
}

echo "Tests completed successfully"
exit 0
