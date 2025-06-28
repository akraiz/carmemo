#!/bin/bash

# CarMemo Real-Time Monitoring Dashboard
# Provides continuous monitoring of all services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:5173"
LOG_FILE="monitor-$(date +%Y%m%d-%H%M%S).log"
CHECK_INTERVAL=30  # seconds

# Statistics
total_checks=0
backend_checks=0
frontend_checks=0
api_checks=0
backend_failures=0
frontend_failures=0
api_failures=0
start_time=$(date +%s)

# Function to clear screen and show header
clear_screen() {
    clear
    echo -e "${CYAN}🚗 CarMemo Real-Time Monitoring Dashboard${NC}"
    echo -e "${CYAN}=============================================${NC}"
    echo "Started: $(date -d @$start_time)"
    echo "Current: $(date)"
    echo "Log: $LOG_FILE"
    echo ""
}

# Function to check service status
check_service() {
    local url=$1
    local service_name=$2
    
    if curl -f -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅${NC}"
        return 0
    else
        echo -e "${RED}❌${NC}"
        return 1
    fi
}

# Function to test API endpoint
test_api() {
    local response
    response=$(curl -s -w "%{http_code}" -X POST "$BACKEND_URL/api/maintenance-schedule" \
        -H "Content-Type: application/json" \
        -d '{"vin": "1HGBH41JXMN109186"}' 2>/dev/null)
    
    local status_code="${response: -3}"
    if [ "$status_code" = "200" ]; then
        echo -e "${GREEN}✅${NC}"
        return 0
    else
        echo -e "${RED}❌${NC}"
        return 1
    fi
}

# Function to get response time
get_response_time() {
    local url=$1
    local start_time=$(date +%s.%N)
    curl -f -s "$url" > /dev/null 2>&1
    local end_time=$(date +%s.%N)
    echo "$end_time - $start_time" | bc -l
}

# Function to calculate uptime percentage
calculate_uptime() {
    local total=$1
    local failures=$2
    if [ $total -eq 0 ]; then
        echo "0.0"
    else
        echo "scale=1; ($total - $failures) * 100 / $total" | bc -l
    fi
}

# Function to format duration
format_duration() {
    local seconds=$1
    local hours=$((seconds / 3600))
    local minutes=$(((seconds % 3600) / 60))
    local secs=$((seconds % 60))
    printf "%02d:%02d:%02d" $hours $minutes $secs
}

# Function to show current status
show_status() {
    local current_time=$(date +%s)
    local uptime=$((current_time - start_time))
    
    echo -e "${BLUE}📊 Current Status${NC}"
    echo "=================================="
    echo "Backend:     $(check_service "$BACKEND_URL/health" "Backend")"
    echo "Frontend:    $(check_service "$FRONTEND_URL" "Frontend")"
    echo "API:         $(test_api)"
    echo ""
    
    echo -e "${BLUE}📈 Statistics${NC}"
    echo "=================================="
    echo "Total Checks:     $total_checks"
    echo "Backend Checks:   $backend_checks"
    echo "Frontend Checks:  $frontend_checks"
    echo "API Checks:       $api_checks"
    echo ""
    
    echo -e "${BLUE}📉 Failure Rates${NC}"
    echo "=================================="
    local backend_uptime=$(calculate_uptime $backend_checks $backend_failures)
    local frontend_uptime=$(calculate_uptime $frontend_checks $frontend_failures)
    local api_uptime=$(calculate_uptime $api_checks $api_failures)
    
    echo "Backend Uptime:   ${backend_uptime}%"
    echo "Frontend Uptime:  ${frontend_uptime}%"
    echo "API Uptime:       ${api_uptime}%"
    echo ""
    
    echo -e "${BLUE}⏱️  Performance${NC}"
    echo "=================================="
    local backend_time=$(get_response_time "$BACKEND_URL/health")
    local frontend_time=$(get_response_time "$FRONTEND_URL")
    
    echo "Backend Response: ${backend_time}s"
    echo "Frontend Response: ${frontend_time}s"
    echo "Monitor Uptime:   $(format_duration $uptime)"
    echo ""
    
    echo -e "${BLUE}🔄 Last Check${NC}"
    echo "=================================="
    echo "Time: $(date)"
    echo "Next check in: ${CHECK_INTERVAL}s"
    echo ""
}

# Function to log status
log_status() {
    local status=$1
    local message=$2
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $status: $message" >> "$LOG_FILE"
}

# Function to show alerts
show_alerts() {
    local alerts=()
    
    # Check for consecutive failures
    if [ $backend_failures -gt 3 ]; then
        alerts+=("Backend has failed $backend_failures times")
    fi
    
    if [ $frontend_failures -gt 3 ]; then
        alerts+=("Frontend has failed $frontend_failures times")
    fi
    
    if [ $api_failures -gt 3 ]; then
        alerts+=("API has failed $api_failures times")
    fi
    
    # Check response times
    local backend_time=$(get_response_time "$BACKEND_URL/health")
    if (( $(echo "$backend_time > 2.0" | bc -l) )); then
        alerts+=("Backend response time is slow: ${backend_time}s")
    fi
    
    local frontend_time=$(get_response_time "$FRONTEND_URL")
    if (( $(echo "$frontend_time > 3.0" | bc -l) )); then
        alerts+=("Frontend response time is slow: ${frontend_time}s")
    fi
    
    if [ ${#alerts[@]} -gt 0 ]; then
        echo -e "${RED}🚨 Active Alerts${NC}"
        echo "=================================="
        for alert in "${alerts[@]}"; do
            echo -e "${RED}⚠️  $alert${NC}"
        done
        echo ""
    fi
}

# Function to show recent logs
show_recent_logs() {
    echo -e "${BLUE}📝 Recent Activity${NC}"
    echo "=================================="
    if [ -f "$LOG_FILE" ]; then
        tail -5 "$LOG_FILE" | while read line; do
            if echo "$line" | grep -q "FAIL"; then
                echo -e "${RED}$line${NC}"
            elif echo "$line" | grep -q "PASS"; then
                echo -e "${GREEN}$line${NC}"
            else
                echo "$line"
            fi
        done
    else
        echo "No logs yet..."
    fi
    echo ""
}

# Function to perform health check
perform_health_check() {
    ((total_checks++))
    
    # Check backend
    ((backend_checks++))
    if check_service "$BACKEND_URL/health" "Backend" > /dev/null; then
        log_status "PASS" "Backend health check"
    else
        ((backend_failures++))
        log_status "FAIL" "Backend health check"
    fi
    
    # Check frontend
    ((frontend_checks++))
    if check_service "$FRONTEND_URL" "Frontend" > /dev/null; then
        log_status "PASS" "Frontend health check"
    else
        ((frontend_failures++))
        log_status "FAIL" "Frontend health check"
    fi
    
    # Check API
    ((api_checks++))
    if test_api > /dev/null; then
        log_status "PASS" "API health check"
    else
        ((api_failures++))
        log_status "FAIL" "API health check"
    fi
}

# Function to show help
show_help() {
    echo -e "${CYAN}CarMemo Monitoring Dashboard Help${NC}"
    echo "=========================================="
    echo "Commands:"
    echo "  h - Show this help"
    echo "  q - Quit monitoring"
    echo "  r - Refresh immediately"
    echo "  l - Show full logs"
    echo "  s - Show system info"
    echo ""
}

# Function to show system info
show_system_info() {
    echo -e "${BLUE}💻 System Information${NC}"
    echo "=================================="
    echo "OS: $(uname -s) $(uname -r)"
    echo "CPU: $(nproc) cores"
    echo "Memory: $(free -h | grep Mem | awk '{print $2}')"
    echo "Disk: $(df -h . | tail -1 | awk '{print $4}') available"
    echo "Load: $(uptime | awk -F'load average:' '{print $2}')"
    echo ""
}

# Main monitoring loop
echo "Starting CarMemo monitoring dashboard..."
echo "Press 'h' for help, 'q' to quit"
echo ""

# Initial health check
perform_health_check

while true; do
    clear_screen
    show_status
    show_alerts
    show_recent_logs
    
    # Check for user input (non-blocking)
    if read -t 1 -n 1 key; then
        case $key in
            h|H)
                clear_screen
                show_help
                read -p "Press Enter to continue..."
                ;;
            q|Q)
                echo "Stopping monitoring..."
                exit 0
                ;;
            r|R)
                perform_health_check
                ;;
            l|L)
                clear_screen
                echo -e "${BLUE}📋 Full Logs${NC}"
                echo "=================================="
                if [ -f "$LOG_FILE" ]; then
                    cat "$LOG_FILE"
                else
                    echo "No logs available"
                fi
                read -p "Press Enter to continue..."
                ;;
            s|S)
                clear_screen
                show_system_info
                read -p "Press Enter to continue..."
                ;;
        esac
    fi
    
    # Wait for next check
    sleep $CHECK_INTERVAL
    
    # Perform health check
    perform_health_check
done 