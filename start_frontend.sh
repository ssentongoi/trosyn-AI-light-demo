#!/bin/bash
# Set the correct PATH for Node.js
export PATH="/usr/local/bin:$PATH"

# Navigate to the frontend directory
cd "$(dirname "$0")/src/frontend"

# Check if Node.js is accessible
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not found in PATH"
    echo "Current PATH: $PATH"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version)
echo "Starting frontend with Node.js $NODE_VERSION"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the development server
echo "Starting development server..."
npm start
