#!/bin/bash

# CarMemo Health Check Script
# This script performs comprehensive health checks on all CarMemo services

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:5173"
LOG_FILE="health-check-$(date +%Y%m%d-%H%M%S).log"

# Test VINs
TEST_VIN="1HGBH41JXMN109186"
INVALID_VIN="INVALID_VIN_12345"

echo "🚗 CarMemo Health Check Started" | tee -a "$LOG_FILE"
echo "Timestamp: $(date)" | tee -a "$LOG_FILE"
echo "Log file: $LOG_FILE" | tee -a "$LOG_FILE"
echo "==================================" | tee -a "$LOG_FILE"

# Function to log results
log_result() {
    local status=$1
    local message=$2
    local color=$3
    
    echo -e "${color}${status}${NC}: ${message}" | tee -a "$LOG_FILE"
}

# Function to check if service is running
check_service() {
    local url=$1
    local service_name=$2
    
    if curl -f -s "$url" > /dev/null 2>&1; then
        log_result "✅ PASS" "$service_name is running" "$GREEN"
        return 0
    else
        log_result "❌ FAIL" "$service_name is not responding" "$RED"
        return 1
    fi
}

# Function to test API endpoint
test_api_endpoint() {
    local endpoint=$1
    local method=$2
    local data=$3
    local expected_status=$4
    local test_name=$5
    
    local response
    local status_code
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -w "%{http_code}" -X POST "$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null)
    else
        response=$(curl -s -w "%{http_code}" -X GET "$endpoint" 2>/dev/null)
    fi
    
    status_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$status_code" = "$expected_status" ]; then
        log_result "✅ PASS" "$test_name (Status: $status_code)" "$GREEN"
        return 0
    else
        log_result "❌ FAIL" "$test_name (Expected: $expected_status, Got: $status_code)" "$RED"
        return 1
    fi
}

# Function to measure response time
measure_response_time() {
    local url=$1
    local test_name=$2
    
    local start_time=$(date +%s.%N)
    local response=$(curl -s -f "$url" 2>/dev/null)
    local end_time=$(date +%s.%N)
    
    local duration=$(echo "$end_time - $start_time" | bc -l)
    
    if [ $? -eq 0 ]; then
        log_result "✅ PASS" "$test_name (${duration}s)" "$GREEN"
        return 0
    else
        log_result "❌ FAIL" "$test_name (timeout)" "$RED"
        return 1
    fi
}

# Initialize counters
total_tests=0
passed_tests=0
failed_tests=0

# 1. Check Backend Health
echo -e "\n${BLUE}🔧 Backend Health Checks${NC}" | tee -a "$LOG_FILE"
((total_tests++))

if check_service "$BACKEND_URL/health" "Backend Health Endpoint"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi

# 2. Check Frontend Health
echo -e "\n${BLUE}🌐 Frontend Health Checks${NC}" | tee -a "$LOG_FILE"
((total_tests++))

if check_service "$FRONTEND_URL" "Frontend Application"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi

# 3. Test VIN Decoding API
echo -e "\n${BLUE}🔍 VIN Decoding API Tests${NC}" | tee -a "$LOG_FILE"

# Test valid VIN
((total_tests++))
if test_api_endpoint "$BACKEND_URL/api/maintenance-schedule" "POST" "{\"vin\": \"$TEST_VIN\"}" "200" "Valid VIN Decoding"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi

# Test invalid VIN
((total_tests++))
if test_api_endpoint "$BACKEND_URL/api/maintenance-schedule" "POST" "{\"vin\": \"$INVALID_VIN\"}" "400" "Invalid VIN Handling"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi

# Test missing VIN
((total_tests++))
if test_api_endpoint "$BACKEND_URL/api/maintenance-schedule" "POST" "{}" "400" "Missing VIN Handling"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi

# 4. Performance Tests
echo -e "\n${BLUE}⚡ Performance Tests${NC}" | tee -a "$LOG_FILE"

# Test VIN decoding response time
((total_tests++))
if measure_response_time "$BACKEND_URL/api/maintenance-schedule" "VIN Decoding Response Time"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi

# 5. External API Health Checks
echo -e "\n${BLUE}🌍 External API Health Checks${NC}" | tee -a "$LOG_FILE"

# Test API Ninjas connectivity (indirectly through our service)
((total_tests++))
response=$(curl -s -X POST "$BACKEND_URL/api/maintenance-schedule" \
    -H "Content-Type: application/json" \
    -d "{\"vin\": \"$TEST_VIN\"}" 2>/dev/null)

if echo "$response" | grep -q "make\|model\|year"; then
    log_result "✅ PASS" "External VIN API (API Ninjas/Gemini) is working" "$GREEN"
    ((passed_tests++))
else
    log_result "❌ FAIL" "External VIN API is not responding properly" "$RED"
    ((failed_tests++))
fi

# 6. Database/Storage Health
echo -e "\n${BLUE}💾 Storage Health Checks${NC}" | tee -a "$LOG_FILE"

# Check if baseline maintenance data exists
((total_tests++))
if [ -f "backend/baselineMaintenance.json" ]; then
    log_result "✅ PASS" "Baseline maintenance data file exists" "$GREEN"
    ((passed_tests++))
else
    log_result "❌ FAIL" "Baseline maintenance data file missing" "$RED"
    ((failed_tests++))
fi

# 7. Environment Variables Check
echo -e "\n${BLUE}🔐 Environment Variables Check${NC}" | tee -a "$LOG_FILE"

# Check if .env file exists
((total_tests++))
if [ -f "backend/.env" ]; then
    log_result "✅ PASS" "Environment file exists" "$GREEN"
    ((passed_tests++))
else
    log_result "❌ FAIL" "Environment file missing" "$RED"
    ((failed_tests++))
fi

# Check if API keys are set
((total_tests++))
if grep -q "API_KEY=" backend/.env && grep -q "API_NINJAS_KEY=" backend/.env; then
    log_result "✅ PASS" "API keys are configured" "$GREEN"
    ((passed_tests++))
else
    log_result "❌ FAIL" "API keys are missing" "$RED"
    ((failed_tests++))
fi

# Summary
echo -e "\n${BLUE}📊 Health Check Summary${NC}" | tee -a "$LOG_FILE"
echo "==================================" | tee -a "$LOG_FILE"
echo "Total Tests: $total_tests" | tee -a "$LOG_FILE"
echo "Passed: $passed_tests" | tee -a "$LOG_FILE"
echo "Failed: $failed_tests" | tee -a "$LOG_FILE"

if [ $failed_tests -eq 0 ]; then
    success_rate=100
else
    success_rate=$(echo "scale=1; $passed_tests * 100 / $total_tests" | bc -l)
fi

echo "Success Rate: ${success_rate}%" | tee -a "$LOG_FILE"

if [ $failed_tests -eq 0 ]; then
    echo -e "${GREEN}🎉 All health checks passed!${NC}" | tee -a "$LOG_FILE"
    exit 0
else
    echo -e "${RED}⚠️  Some health checks failed. Please review the log: $LOG_FILE${NC}" | tee -a "$LOG_FILE"
    exit 1
fi 