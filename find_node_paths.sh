#!/bin/bash

# Script to find Node.js and npm installations on the system

echo "Searching for Node.js installations..."

# Check common installation paths
NODE_PATHS=(
  "/usr/local/bin/node"
  "/usr/bin/node"
  "/opt/homebrew/bin/node"
  "$HOME/.nvm/versions/node/*/bin/node"
  "/opt/local/bin/node"
)

for path in "${NODE_PATHS[@]}"; do
  # Expand any wildcards in the path
  for expanded_path in $path; do
    if [ -x "$expanded_path" ]; then
      echo "Found Node.js at: $expanded_path"
      echo "Version: $($expanded_path --version)"
      
      # Find npm in the same directory
      NPM_PATH="$(dirname "$expanded_path")/npm"
      if [ -x "$NPM_PATH" ]; then
        echo "Found npm at: $NPM_PATH"
        echo "npm version: $($NPM_PATH --version)"
      fi
      
      echo ""
    fi
  done
done

echo "Current PATH: $PATH"
echo ""
echo "To use a specific Node.js version, you can add it to your PATH like this:"
echo "export PATH=\"$(dirname "$expanded_path"):\$PATH\""
echo ""
echo "Then try running your npm commands again."
