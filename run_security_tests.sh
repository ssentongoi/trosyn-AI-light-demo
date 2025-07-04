#!/bin/bash

# Set Python path to include the src directory
export PYTHONPATH="/Users/ssentongoivan/CascadeProjects/trosyn-ai/src/trosyn-sync:$PYTHONPATH"

# Install test dependencies if not already installed
python3 -m pip install -q pytest pytest-mock pytest-asyncio

# Run the security tests
echo "Running security tests..."
python3 -m pytest tests/security/test_security.py -v

# Run the security scanner
echo -e "\nRunning security scanner..."
python3 -c "
import sys
from trosyn_sync.security.scanner import run_security_scan, print_security_report

# Run the scanner on the trosyn_sync package
results = run_security_scan('/Users/ssentongoivan/CascadeProjects/trosyn-ai/src/trosyn-sync')
print_security_report(results)
"
