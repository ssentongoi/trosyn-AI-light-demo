#!/bin/bash

# Set up the environment
export PATH="/usr/local/bin:$PATH"

# Navigate to the frontend directory
cd "$(dirname "$0")/src/frontend" || exit 1

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Failed to install dependencies"
        exit 1
    fi
fi

# Start the frontend server
echo "Starting frontend server..."
npm start
