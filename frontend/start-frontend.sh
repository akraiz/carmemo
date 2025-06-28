#!/bin/bash

# Frontend Startup Script with Backend Integration
# This script sets up and starts the frontend with backend integration testing

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if backend is running
check_backend() {
    print_status "Checking backend connectivity..."
    
    if command_exists curl; then
        if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
            print_success "Backend is running and accessible"
            return 0
        else
            print_warning "Backend is not accessible at http://localhost:3001"
            return 1
        fi
    else
        print_warning "curl not available, skipping backend check"
        return 1
    fi
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing frontend dependencies..."
    
    if [ ! -d "node_modules" ]; then
        npm install
        print_success "Dependencies installed successfully"
    else
        print_status "Dependencies already installed, checking for updates..."
        npm install
        print_success "Dependencies updated successfully"
    fi
}

# Function to run integration tests
run_integration_tests() {
    print_status "Running integration tests..."
    
    if [ -f "test-integration.js" ]; then
        # Install node-fetch if not available
        if ! npm list node-fetch >/dev/null 2>&1; then
            print_status "Installing node-fetch for integration tests..."
            npm install --save-dev node-fetch
        fi
        
        # Run the integration test
        if node test-integration.js; then
            print_success "Integration tests passed"
        else
            print_warning "Integration tests failed - backend may not be running"
        fi
    else
        print_warning "Integration test script not found"
    fi
}

# Function to create environment file
create_env_file() {
    if [ ! -f ".env" ]; then
        print_status "Creating .env file..."
        cat > .env << EOF
# Backend API Configuration
VITE_API_BASE_URL=http://localhost:3001/api

# Optional: Override default API URL for production
# VITE_API_BASE_URL=https://your-backend-domain.com/api

# Optional: Enable/disable backend integration (default: true)
# VITE_USE_BACKEND=true

# Optional: Enable debug logging for API calls
# VITE_DEBUG_API=false
EOF
        print_success ".env file created"
    else
        print_status ".env file already exists"
    fi
}

# Function to start development server
start_dev_server() {
    print_status "Starting development server..."
    
    # Check if port 5173 is available
    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port 5173 is already in use"
        print_status "Trying alternative port..."
        npm run dev -- --port 5174
    else
        npm run dev
    fi
}

# Main execution
main() {
    echo "🚀 Frontend Startup Script with Backend Integration"
    echo "=================================================="
    echo ""
    
    # Check if we're in the frontend directory
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Please run this script from the frontend directory."
        exit 1
    fi
    
    # Check Node.js and npm
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_success "Node.js $(node --version) and npm $(npm --version) detected"
    
    # Create environment file
    create_env_file
    
    # Install dependencies
    install_dependencies
    
    # Check backend connectivity
    if check_backend; then
        # Run integration tests if backend is available
        run_integration_tests
    else
        print_warning "Backend not detected. Frontend will run in localStorage mode."
        print_status "To start the backend, run: cd ../backend && npm run dev"
    fi
    
    echo ""
    print_status "Starting frontend development server..."
    print_status "Frontend will be available at: http://localhost:5173"
    print_status "Backend API will be available at: http://localhost:3001/api"
    echo ""
    
    # Start the development server
    start_dev_server
}

# Handle script interruption
trap 'print_error "Script interrupted"; exit 1' INT TERM

# Run main function
main "$@" 