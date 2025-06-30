#!/bin/bash

# Source nvm to make it available in this script
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use the latest Node.js version installed via nvm
nvm use v22.17.0

# Run the npm command with all arguments passed to this script
npm "$@"
