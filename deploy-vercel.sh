#!/bin/bash

# Vercel Frontend Deployment Script for CarMemo
# This script automates frontend deployment to Vercel

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

echo "🚀 CarMemo Frontend Deployment to Vercel"
echo "========================================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_status "Installing Vercel CLI..."
    npm install -g vercel
fi

# Check if user is logged in
if ! vercel whoami &> /dev/null; then
    print_status "Please login to Vercel..."
    vercel login
fi

# Check if backend URL is provided
if [ -z "$1" ]; then
    print_warning "No backend URL provided"
    print_status "Usage: $0 <backend-url>"
    print_status "Example: $0 https://your-app.railway.app"
    echo ""
    print_status "Please provide your backend URL and run this script again"
    exit 1
fi

BACKEND_URL=$1

# Navigate to frontend directory
cd frontend

# Create production environment file
print_status "Creating production environment file..."
cat > .env.production << EOF
VITE_API_BASE_URL=$BACKEND_URL/api
VITE_USE_BACKEND=true
VITE_DEBUG_API=false
EOF

print_success "Environment file created with backend URL: $BACKEND_URL"

# Build the application
print_status "Building the application..."
npm run build

if [ $? -eq 0 ]; then
    print_success "Build completed successfully!"
else
    print_error "Build failed. Please check the errors above."
    exit 1
fi

# Deploy to Vercel
print_status "Deploying to Vercel..."
vercel --prod

print_success "Frontend deployed to Vercel successfully!"

# Get the deployment URL
DEPLOYMENT_URL=$(vercel ls --json | grep -o '"url":"[^"]*"' | cut -d'"' -f4 | head -1)

if [ ! -z "$DEPLOYMENT_URL" ]; then
    print_success "Frontend URL: $DEPLOYMENT_URL"
    echo ""
    print_warning "Remember to update your backend CORS_ORIGIN:"
    echo "CORS_ORIGIN=$DEPLOYMENT_URL"
fi

echo ""
print_status "Next steps:"
print_status "1. Update CORS_ORIGIN in your backend environment variables"
print_status "2. Test the application"
print_status "3. Configure custom domain (optional)" 