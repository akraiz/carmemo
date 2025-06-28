#!/bin/bash

# Railway Backend Deployment Script for CarMemo
# This script automates backend deployment to Railway

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

echo "🚀 CarMemo Backend Deployment to Railway"
echo "========================================"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    print_status "Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    print_status "Please login to Railway..."
    railway login
fi

# Check if .env file exists
if [ ! -f backend/.env ]; then
    print_warning "No .env file found in backend directory"
    print_status "Please create backend/.env with the following variables:"
    echo ""
    echo "NODE_ENV=production"
    echo "PORT=3001"
    echo "MONGODB_URI=your_mongodb_connection_string"
    echo "API_NINJAS_KEY=your_api_ninjas_key"
    echo "API_KEY=your_gemini_api_key"
    echo "CORS_ORIGIN=https://your-frontend-url.vercel.app"
    echo ""
    print_error "Please create the .env file and run this script again"
    exit 1
fi

# Navigate to backend directory
cd backend

print_status "Deploying to Railway..."

# Deploy to Railway
railway up

print_success "Backend deployed to Railway successfully!"
print_status "Your backend URL will be shown above"
print_status "Use this URL to configure your frontend deployment"

# Get the deployment URL
DEPLOYMENT_URL=$(railway status --json | grep -o '"url":"[^"]*"' | cut -d'"' -f4)

if [ ! -z "$DEPLOYMENT_URL" ]; then
    print_success "Backend URL: $DEPLOYMENT_URL"
    print_status "API Health Check: $DEPLOYMENT_URL/health"
    echo ""
    print_warning "Remember to update your frontend environment variables:"
    echo "VITE_API_BASE_URL=$DEPLOYMENT_URL/api"
fi

echo ""
print_status "Next steps:"
print_status "1. Deploy frontend to Vercel/Netlify"
print_status "2. Update CORS_ORIGIN in Railway environment variables"
print_status "3. Test the application" 