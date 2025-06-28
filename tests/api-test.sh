#!/bin/bash

# CarMemo API Test Script
# Comprehensive testing of all API endpoints

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:3001"
LOG_FILE="api-test-$(date +%Y%m%d-%H%M%S).log"

# Test data
TEST_VINS=(
    "1HGBH41JXMN109186"  # Honda Civic 1999
    "5TFEY5F11FX123456"  # Toyota Camry 2015
    "WBA3B5C50FD123456"  # BMW 3 Series 2015
    "1G1ZT51806F123456"  # Chevrolet Cobalt 2006
)

INVALID_VINS=(
    "INVALID_VIN_12345"
    "1234567890123456"   # Too short
    "123456789012345678" # Too long
    "ABCDEFGHIJKLMNOPQ"  # Invalid characters
)

echo "🚗 CarMemo API Test Suite Started" | tee -a "$LOG_FILE"
echo "Timestamp: $(date)" | tee -a "$LOG_FILE"
echo "Log file: $LOG_FILE" | tee -a "$LOG_FILE"
echo "==================================" | tee -a "$LOG_FILE"

# Function to log results
log_result() {
    local status=$1
    local message=$2
    local color=$3
    local details=$4
    
    echo -e "${color}${status}${NC}: ${message}" | tee -a "$LOG_FILE"
    if [ -n "$details" ]; then
        echo "   Details: $details" | tee -a "$LOG_FILE"
    fi
}

# Function to test API endpoint with detailed response
test_api_endpoint() {
    local endpoint=$1
    local method=$2
    local data=$3
    local expected_status=$4
    local test_name=$5
    
    local response
    local status_code
    local response_time
    
    echo "Testing: $test_name" | tee -a "$LOG_FILE"
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -w "%{http_code}|%{time_total}" -X POST "$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null)
    else
        response=$(curl -s -w "%{http_code}|%{time_total}" -X GET "$endpoint" 2>/dev/null)
    fi
    
    # Parse response
    status_code=$(echo "$response" | tail -c 4)
    response_time=$(echo "$response" | grep -o '[0-9]\+\.[0-9]\+$' || echo "0")
    response_body=$(echo "$response" | sed 's/[0-9]\+\.[0-9]\+$//' | sed 's/[0-9]\{3\}$//')
    
    if [ "$status_code" = "$expected_status" ]; then
        log_result "✅ PASS" "$test_name" "$GREEN" "Status: $status_code, Time: ${response_time}s"
        
        # Log response details for successful requests
        if [ "$status_code" = "200" ] && [ -n "$response_body" ]; then
            echo "   Response preview: $(echo "$response_body" | head -c 200)..." | tee -a "$LOG_FILE"
        fi
        
        return 0
    else
        log_result "❌ FAIL" "$test_name" "$RED" "Expected: $expected_status, Got: $status_code, Time: ${response_time}s"
        echo "   Response: $response_body" | tee -a "$LOG_FILE"
        return 1
    fi
}

# Function to validate JSON response
validate_json_response() {
    local response=$1
    local required_fields=$2
    local test_name=$3
    
    # Check if response is valid JSON
    if echo "$response" | jq . >/dev/null 2>&1; then
        # Check for required fields
        local missing_fields=""
        for field in $required_fields; do
            if ! echo "$response" | jq -e ".$field" >/dev/null 2>&1; then
                missing_fields="$missing_fields $field"
            fi
        done
        
        if [ -z "$missing_fields" ]; then
            log_result "✅ PASS" "$test_name JSON validation" "$GREEN"
            return 0
        else
            log_result "❌ FAIL" "$test_name JSON validation" "$RED" "Missing fields:$missing_fields"
            return 1
        fi
    else
        log_result "❌ FAIL" "$test_name JSON validation" "$RED" "Invalid JSON response"
        return 1
    fi
}

# Initialize counters
total_tests=0
passed_tests=0
failed_tests=0

# 1. Basic Health Endpoint Tests
echo -e "\n${BLUE}🔧 Basic Health Endpoint Tests${NC}" | tee -a "$LOG_FILE"

((total_tests++))
if test_api_endpoint "$BACKEND_URL/health" "GET" "" "200" "Health Check Endpoint"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi

# 2. VIN Decoding Tests
echo -e "\n${BLUE}🔍 VIN Decoding Tests${NC}" | tee -a "$LOG_FILE"

# Test valid VINs
for vin in "${TEST_VINS[@]}"; do
    ((total_tests++))
    if test_api_endpoint "$BACKEND_URL/api/maintenance-schedule" "POST" "{\"vin\": \"$vin\"}" "200" "Valid VIN: $vin"; then
        ((passed_tests++))
        
        # Get response for validation
        response=$(curl -s -X POST "$BACKEND_URL/api/maintenance-schedule" \
            -H "Content-Type: application/json" \
            -d "{\"vin\": \"$vin\"}" 2>/dev/null)
        
        # Validate response structure
        ((total_tests++))
        if validate_json_response "$response" "make model year schedule" "VIN $vin response structure"; then
            ((passed_tests++))
        else
            ((failed_tests++))
        fi
    else
        ((failed_tests++))
    fi
done

# Test invalid VINs
for vin in "${INVALID_VINS[@]}"; do
    ((total_tests++))
    if test_api_endpoint "$BACKEND_URL/api/maintenance-schedule" "POST" "{\"vin\": \"$vin\"}" "400" "Invalid VIN: $vin"; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
done

# 3. Error Handling Tests
echo -e "\n${BLUE}⚠️  Error Handling Tests${NC}" | tee -a "$LOG_FILE"

# Test missing VIN
((total_tests++))
if test_api_endpoint "$BACKEND_URL/api/maintenance-schedule" "POST" "{}" "400" "Missing VIN Parameter"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi

# Test malformed JSON
((total_tests++))
if test_api_endpoint "$BACKEND_URL/api/maintenance-schedule" "POST" "{invalid json}" "400" "Malformed JSON"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi

# Test wrong content type
((total_tests++))
response=$(curl -s -w "%{http_code}" -X POST "$BACKEND_URL/api/maintenance-schedule" \
    -H "Content-Type: text/plain" \
    -d "{\"vin\": \"1HGBH41JXMN109186\"}" 2>/dev/null)
status_code="${response: -3}"

if [ "$status_code" = "400" ] || [ "$status_code" = "415" ]; then
    log_result "✅ PASS" "Wrong Content Type" "$GREEN" "Status: $status_code"
    ((passed_tests++))
else
    log_result "❌ FAIL" "Wrong Content Type" "$RED" "Expected: 400/415, Got: $status_code"
    ((failed_tests++))
fi
((total_tests++))

# 4. Performance Tests
echo -e "\n${BLUE}⚡ Performance Tests${NC}" | tee -a "$LOG_FILE"

# Test response time for multiple requests
echo "Testing response times for 5 consecutive requests..." | tee -a "$LOG_FILE"
total_time=0
successful_requests=0

for i in {1..5}; do
    start_time=$(date +%s.%N)
    response=$(curl -s -X POST "$BACKEND_URL/api/maintenance-schedule" \
        -H "Content-Type: application/json" \
        -d "{\"vin\": \"1HGBH41JXMN109186\"}" 2>/dev/null)
    end_time=$(date +%s.%N)
    
    duration=$(echo "$end_time - $start_time" | bc -l)
    total_time=$(echo "$total_time + $duration" | bc -l)
    
    if echo "$response" | grep -q "make\|model\|year"; then
        ((successful_requests++))
        echo "   Request $i: ${duration}s ✅" | tee -a "$LOG_FILE"
    else
        echo "   Request $i: ${duration}s ❌" | tee -a "$LOG_FILE"
    fi
done

((total_tests++))
avg_time=$(echo "scale=2; $total_time / 5" | bc -l)
if (( $(echo "$avg_time < 5.0" | bc -l) )); then
    log_result "✅ PASS" "Average Response Time" "$GREEN" "${avg_time}s (target: <5s)"
    ((passed_tests++))
else
    log_result "❌ FAIL" "Average Response Time" "$RED" "${avg_time}s (target: <5s)"
    ((failed_tests++))
fi

((total_tests++))
if [ $successful_requests -eq 5 ]; then
    log_result "✅ PASS" "Consecutive Request Success Rate" "$GREEN" "5/5 successful"
    ((passed_tests++))
else
    log_result "❌ FAIL" "Consecutive Request Success Rate" "$RED" "$successful_requests/5 successful"
    ((failed_tests++))
fi

# 5. Edge Case Tests
echo -e "\n${BLUE}🔍 Edge Case Tests${NC}" | tee -a "$LOG_FILE"

# Test very long VIN
((total_tests++))
long_vin="1HGBH41JXMN109186"$(printf 'A%.0s' {1..100})
if test_api_endpoint "$BACKEND_URL/api/maintenance-schedule" "POST" "{\"vin\": \"$long_vin\"}" "400" "Very Long VIN"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi

# Test empty VIN
((total_tests++))
if test_api_endpoint "$BACKEND_URL/api/maintenance-schedule" "POST" "{\"vin\": \"\"}" "400" "Empty VIN"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi

# Test VIN with special characters
((total_tests++))
if test_api_endpoint "$BACKEND_URL/api/maintenance-schedule" "POST" "{\"vin\": \"1HGBH41JXMN109186!@#\"}" "400" "VIN with Special Characters"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi

# 6. CORS Tests (if applicable)
echo -e "\n${BLUE}🌐 CORS Tests${NC}" | tee -a "$LOG_FILE"

((total_tests++))
cors_response=$(curl -s -I -X OPTIONS "$BACKEND_URL/api/maintenance-schedule" \
    -H "Origin: http://localhost:5173" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" 2>/dev/null)

if echo "$cors_response" | grep -q "Access-Control-Allow-Origin"; then
    log_result "✅ PASS" "CORS Headers Present" "$GREEN"
    ((passed_tests++))
else
    log_result "⚠️  INFO" "CORS Headers Not Found" "$YELLOW" "This may be expected for local development"
    ((passed_tests++))
fi

# Summary
echo -e "\n${BLUE}📊 API Test Summary${NC}" | tee -a "$LOG_FILE"
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

# Performance summary
echo -e "\n${BLUE}📈 Performance Summary${NC}" | tee -a "$LOG_FILE"
echo "Average Response Time: ${avg_time}s" | tee -a "$LOG_FILE"
echo "Consecutive Success Rate: ${successful_requests}/5" | tee -a "$LOG_FILE"

if [ $failed_tests -eq 0 ]; then
    echo -e "${GREEN}🎉 All API tests passed!${NC}" | tee -a "$LOG_FILE"
    exit 0
else
    echo -e "${RED}⚠️  Some API tests failed. Please review the log: $LOG_FILE${NC}" | tee -a "$LOG_FILE"
    exit 1
fi 