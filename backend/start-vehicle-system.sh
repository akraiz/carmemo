#!/bin/bash

# CarMemo Vehicle Management System - Quick Start Script
# This script helps you start and test the vehicle management system

set -e

echo "🚗 CarMemo Vehicle Management System - Quick Start"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    print_status "Node.js found: $NODE_VERSION"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    NPM_VERSION=$(npm --version)
    print_status "npm found: $NPM_VERSION"
}

# Check if MongoDB is running
check_mongodb() {
    if ! command -v mongod &> /dev/null; then
        print_warning "MongoDB is not installed or not in PATH."
        print_info "You can install MongoDB or use MongoDB Atlas."
        print_info "For local development, install MongoDB from: https://docs.mongodb.com/manual/installation/"
    else
        if pgrep -x "mongod" > /dev/null; then
            print_status "MongoDB is running"
        else
            print_warning "MongoDB is not running. Starting MongoDB..."
            mongod --fork --logpath /tmp/mongod.log
            sleep 2
            if pgrep -x "mongod" > /dev/null; then
                print_status "MongoDB started successfully"
            else
                print_error "Failed to start MongoDB"
                exit 1
            fi
        fi
    fi
}

# Install dependencies
install_dependencies() {
    print_info "Installing dependencies..."
    npm install
    print_status "Dependencies installed successfully"
}

# Check environment variables
check_environment() {
    print_info "Checking environment variables..."
    
    if [ -z "$MONGODB_URI" ]; then
        print_warning "MONGODB_URI not set. Using default: mongodb://localhost:27017/carmemo"
        export MONGODB_URI="mongodb://localhost:27017/carmemo"
    fi
    
    if [ -z "$API_NINJAS_KEY" ]; then
        print_warning "API_NINJAS_KEY not set. VIN lookup will be limited."
        print_info "Get your API key from: https://api-ninjas.com/"
    fi
    
    if [ -z "$GOOGLE_API_KEY" ]; then
        print_warning "GOOGLE_API_KEY not set. AI features will be limited."
        print_info "Get your API key from: https://makersuite.google.com/app/apikey"
    fi
    
    if [ -z "$PORT" ]; then
        export PORT=3001
        print_info "PORT not set. Using default: 3001"
    fi
}

# Start the server
start_server() {
    print_info "Starting the backend server..."
    
    # Check if server is already running
    if curl -s http://localhost:$PORT/health > /dev/null 2>&1; then
        print_warning "Server is already running on port $PORT"
        return 0
    fi
    
    # Start server in background
    npm start &
    SERVER_PID=$!
    
    # Wait for server to start
    print_info "Waiting for server to start..."
    for i in {1..30}; do
        if curl -s http://localhost:$PORT/health > /dev/null 2>&1; then
            print_status "Server started successfully on port $PORT"
            return 0
        fi
        sleep 1
    done
    
    print_error "Server failed to start within 30 seconds"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
}

# Run tests
run_tests() {
    print_info "Running vehicle management API tests..."
    
    if [ -f "test-vehicle-api.js" ]; then
        node test-vehicle-api.js
        if [ $? -eq 0 ]; then
            print_status "All tests passed!"
        else
            print_error "Some tests failed. Check the output above."
        fi
    else
        print_warning "Test file not found. Skipping tests."
    fi
}

# Show API examples
show_examples() {
    echo ""
    print_info "API Examples:"
    echo "=============="
    echo ""
    echo "1. Create a vehicle:"
    echo "curl -X POST http://localhost:$PORT/api/vehicles \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -d '{\"make\":\"Toyota\",\"model\":\"Camry\",\"year\":2020,\"vin\":\"1HGBH41JXMN109186\"}'"
    echo ""
    echo "2. Get all vehicles:"
    echo "curl http://localhost:$PORT/api/vehicles"
    echo ""
    echo "3. Search vehicles:"
    echo "curl \"http://localhost:$PORT/api/vehicles/search?make=toyota\""
    echo ""
    echo "4. Get vehicle statistics:"
    echo "curl http://localhost:$PORT/api/vehicles/stats"
    echo ""
    echo "5. Health check:"
    echo "curl http://localhost:$PORT/health"
    echo ""
}

# Show documentation links
show_documentation() {
    echo ""
    print_info "Documentation:"
    echo "==============="
    echo ""
    echo "📖 API Documentation: API_DOCUMENTATION.md"
    echo "📖 System Overview: VEHICLE_MANAGEMENT_README.md"
    echo "📖 Test Script: test-vehicle-api.js"
    echo ""
    echo "🌐 API Base URL: http://localhost:$PORT/api"
    echo "🔍 Health Check: http://localhost:$PORT/health"
    echo ""
}

# Main function
main() {
    echo ""
    print_info "Starting CarMemo Vehicle Management System..."
    echo ""
    
    # Check prerequisites
    check_node
    check_npm
    check_mongodb
    
    # Install dependencies
    if [ ! -d "node_modules" ]; then
        install_dependencies
    else
        print_status "Dependencies already installed"
    fi
    
    # Check environment
    check_environment
    
    # Start server
    start_server
    
    # Run tests
    run_tests
    
    # Show examples and documentation
    show_examples
    show_documentation
    
    print_status "Vehicle Management System is ready!"
    echo ""
    print_info "Press Ctrl+C to stop the server"
    echo ""
    
    # Keep script running
    wait $SERVER_PID
}

# Handle script interruption
cleanup() {
    if [ ! -z "$SERVER_PID" ]; then
        print_info "Stopping server..."
        kill $SERVER_PID 2>/dev/null || true
    fi
    print_status "Cleanup completed"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Run main function
main "$@" 