#!/bin/bash

# MongoDB Atlas Setup Script for CarMemo
# This script helps set up MongoDB Atlas database

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

echo "🗄️ MongoDB Atlas Setup for CarMemo"
echo "=================================="
echo ""

print_status "This script will help you set up MongoDB Atlas for CarMemo"
echo ""

print_warning "Prerequisites:"
print_status "1. MongoDB Atlas account (free tier)"
print_status "2. Internet connection"
print_status "3. Web browser"
echo ""

print_status "Step-by-step setup instructions:"
echo ""

print_status "1. Create MongoDB Atlas Account:"
print_status "   - Go to: https://www.mongodb.com/atlas"
print_status "   - Click 'Try Free'"
print_status "   - Create account and verify email"
echo ""

print_status "2. Create Database Cluster:"
print_status "   - Click 'Build a Database'"
print_status "   - Choose 'FREE' tier (M0)"
print_status "   - Select cloud provider (AWS/Google Cloud/Azure)"
print_status "   - Choose region closest to you"
print_status "   - Click 'Create'"
echo ""

print_status "3. Configure Database Access:"
print_status "   - Go to 'Database Access' in left sidebar"
print_status "   - Click 'Add New Database User'"
print_status "   - Create username and password (save these!)"
print_status "   - Select 'Read and write to any database'"
print_status "   - Click 'Add User'"
echo ""

print_status "4. Configure Network Access:"
print_status "   - Go to 'Network Access' in left sidebar"
print_status "   - Click 'Add IP Address'"
print_status "   - Click 'Allow Access from Anywhere' (0.0.0.0/0)"
print_status "   - Click 'Confirm'"
echo ""

print_status "5. Get Connection String:"
print_status "   - Go to 'Database' in left sidebar"
print_status "   - Click 'Connect'"
print_status "   - Choose 'Connect your application'"
print_status "   - Copy the connection string"
print_status "   - Replace <password> with your database password"
echo ""

print_warning "Important Security Notes:"
print_status "- Save your database username and password securely"
print_status "- The connection string contains sensitive information"
print_status "- Never commit the connection string to version control"
echo ""

print_status "Example connection string format:"
echo "mongodb+srv://username:password@cluster.mongodb.net/carmemo?retryWrites=true&w=majority"
echo ""

print_status "After setup, create backend/.env file with:"
echo ""
echo "NODE_ENV=production"
echo "PORT=3001"
echo "MONGODB_URI=your_connection_string_here"
echo "API_NINJAS_KEY=your_api_ninjas_key"
echo "API_KEY=your_gemini_api_key"
echo "CORS_ORIGIN=https://your-frontend-url.vercel.app"
echo ""

print_success "MongoDB Atlas setup instructions completed!"
print_status "Follow the steps above to create your database"
print_status "Then run the deployment scripts to deploy your application" 