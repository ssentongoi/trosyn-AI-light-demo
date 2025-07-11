#!/bin/bash

# Set the correct PATH for this script
export PATH="/usr/local/bin:$PATH"

# Navigate to the frontend directory
cd "$(dirname "$0")/src/frontend" || exit 1

# Check if node is available
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not found in the PATH"
    echo "Trying to find Node.js..."
    NODE_PATH=$(find /usr -name node -type f -executable 2>/dev/null | head -n 1)
    
    if [ -z "$NODE_PATH" ]; then
        echo "Node.js not found. Please install Node.js and try again."
        exit 1
    else
        echo "Found Node.js at $NODE_PATH"
        export PATH="$(dirname "$NODE_PATH"):$PATH"
    fi
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not found in the PATH"
    echo "Trying to find npm..."
    NPM_PATH=$(find /usr -name npm -type f -executable 2>/dev/null | head -n 1)
    
    if [ -z "$NPM_PATH" ]; then
        echo "npm not found. Please install npm and try again."
        exit 1
    else
        echo "Found npm at $NPM_PATH"
        export PATH="$(dirname "$NPM_PATH"):$PATH"
    fi
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install || { echo "Failed to install dependencies"; exit 1; }
fi

# Run the tests with verbose output
echo "Running tests with Node.js $(node --version) and npm $(npm --version)"
npm test -- --verbose --watchAll=false --coverage || {
    echo "Tests failed"
    exit 1
}

echo "Tests completed successfully"
exit 0
