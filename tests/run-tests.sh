#!/bin/bash

# CarMemo Test Runner
# Executes all test suites and provides a comprehensive report

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
REPORT_FILE="test-report-$(date +%Y%m%d-%H%M%S).md"

echo -e "${CYAN}🚗 CarMemo Test Suite Runner${NC}"
echo "=================================="
echo "Starting comprehensive test suite..."
echo "Report will be saved to: $REPORT_FILE"
echo ""

# Initialize report
cat > "$REPORT_FILE" << EOF
# CarMemo Test Report
Generated: $(date)

## Test Summary

EOF

# Function to run test and capture results
run_test() {
    local test_name=$1
    local test_script=$2
    local description=$3
    
    echo -e "${BLUE}Running: $test_name${NC}"
    echo "Description: $description"
    echo "Script: $test_script"
    echo ""
    
    # Run the test
    if ./tests/$test_script; then
        echo -e "${GREEN}✅ $test_name PASSED${NC}"
        echo "## ✅ $test_name - PASSED" >> "$REPORT_FILE"
        echo "$description" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        return 0
    else
        echo -e "${RED}❌ $test_name FAILED${NC}"
        echo "## ❌ $test_name - FAILED" >> "$REPORT_FILE"
        echo "$description" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        return 1
    fi
}

# Initialize counters
total_tests=0
passed_tests=0
failed_tests=0

# 1. Health Check Test
((total_tests++))
if run_test "Health Check" "health-check.sh" "Comprehensive health checks for all CarMemo services"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi

# 2. API Test
((total_tests++))
if run_test "API Test" "api-test.sh" "Detailed API endpoint testing and validation"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi

# 3. Linting Test
echo -e "${BLUE}Running: Linting Check${NC}"
echo "Description: Code quality and style checks"
echo ""

((total_tests++))
if cd frontend && npm run lint >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend Linting PASSED${NC}"
    echo "## ✅ Frontend Linting - PASSED" >> "../$REPORT_FILE"
    echo "Code quality and style checks passed" >> "../$REPORT_FILE"
    echo "" >> "../$REPORT_FILE"
    ((passed_tests++))
else
    echo -e "${RED}❌ Frontend Linting FAILED${NC}"
    echo "## ❌ Frontend Linting - FAILED" >> "../$REPORT_FILE"
    echo "Code quality and style checks failed" >> "../$REPORT_FILE"
    echo "" >> "../$REPORT_FILE"
    ((failed_tests++))
fi
cd ..

# 4. TypeScript Check
echo -e "${BLUE}Running: TypeScript Check${NC}"
echo "Description: Type safety validation"
echo ""

((total_tests++))
if cd frontend && npx tsc --noEmit >/dev/null 2>&1; then
    echo -e "${GREEN}✅ TypeScript Check PASSED${NC}"
    echo "## ✅ TypeScript Check - PASSED" >> "../$REPORT_FILE"
    echo "Type safety validation passed" >> "../$REPORT_FILE"
    echo "" >> "../$REPORT_FILE"
    ((passed_tests++))
else
    echo -e "${RED}❌ TypeScript Check FAILED${NC}"
    echo "## ❌ TypeScript Check - FAILED" >> "../$REPORT_FILE"
    echo "Type safety validation failed" >> "../$REPORT_FILE"
    echo "" >> "../$REPORT_FILE"
    ((failed_tests++))
fi
cd ..

# 5. Build Test
echo -e "${BLUE}Running: Build Test${NC}"
echo "Description: Production build validation"
echo ""

((total_tests++))
if cd frontend && npm run build >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Build Test PASSED${NC}"
    echo "## ✅ Build Test - PASSED" >> "../$REPORT_FILE"
    echo "Production build successful" >> "../$REPORT_FILE"
    echo "" >> "../$REPORT_FILE"
    ((passed_tests++))
else
    echo -e "${RED}❌ Build Test FAILED${NC}"
    echo "## ❌ Build Test - FAILED" >> "../$REPORT_FILE"
    echo "Production build failed" >> "../$REPORT_FILE"
    echo "" >> "../$REPORT_FILE"
    ((failed_tests++))
fi
cd ..

# Calculate success rate
if [ $total_tests -eq 0 ]; then
    success_rate=0
else
    success_rate=$(echo "scale=1; $passed_tests * 100 / $total_tests" | bc -l)
fi

# Final summary
echo -e "\n${CYAN}📊 Test Suite Summary${NC}"
echo "=================================="
echo "Total Tests: $total_tests"
echo "Passed: $passed_tests"
echo "Failed: $failed_tests"
echo "Success Rate: ${success_rate}%"
echo ""

# Add summary to report
cat >> "$REPORT_FILE" << EOF
## 📊 Test Summary

- **Total Tests**: $total_tests
- **Passed**: $passed_tests
- **Failed**: $failed_tests
- **Success Rate**: ${success_rate}%

## 🎯 Recommendations

EOF

if [ $failed_tests -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Your CarMemo application is healthy and ready for production.${NC}"
    echo "## 🎉 All Tests Passed!" >> "$REPORT_FILE"
    echo "Your CarMemo application is healthy and ready for production." >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "### Next Steps:" >> "$REPORT_FILE"
    echo "1. Deploy to production" >> "$REPORT_FILE"
    echo "2. Set up monitoring alerts" >> "$REPORT_FILE"
    echo "3. Schedule regular health checks" >> "$REPORT_FILE"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please review the issues and fix them before deployment.${NC}"
    echo "## ⚠️ Some Tests Failed" >> "$REPORT_FILE"
    echo "Please review the issues and fix them before deployment." >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "### Recommended Actions:" >> "$REPORT_FILE"
    echo "1. Review failed test logs" >> "$REPORT_FILE"
    echo "2. Fix identified issues" >> "$REPORT_FILE"
    echo "3. Re-run tests to verify fixes" >> "$REPORT_FILE"
    echo "4. Only deploy after all tests pass" >> "$REPORT_FILE"
    exit 1
fi 