#!/bin/bash

echo "🧪 Running Trosyn AI Document Tests"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

run_test_suite() {
    local test_name=$1
    local test_filter=$2
    
    echo -e "\n${YELLOW}Running $test_name...${NC}"
    
    if cargo test $test_filter --lib -- --nocapture; then
        echo -e "${GREEN}✅ $test_name passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name failed${NC}"
        return 1
    fi
}

# Run different test suites
echo "Running all document tests..."

# Core functionality tests
run_test_suite "Document Creation Tests" "document_creation"
run_test_suite "Document Content Tests" "document_content"
run_test_suite "Document Versioning Tests" "document_versioning"
run_test_suite "Document Serialization Tests" "document_serialization"
run_test_suite "Edge Cases Tests" "edge_cases"
run_test_suite "Integration Scenarios" "integration_scenarios"
run_test_suite "Performance Tests" "performance"

echo -e "\n${YELLOW}Running all tests together...${NC}"
if cargo test documents --lib -- --nocapture; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
else
    echo -e "${RED}💥 Some tests failed${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Test run complete!${NC}"
