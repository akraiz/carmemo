#!/bin/bash

# VIN Index Fix Deployment Script
# This script fixes the VIN index to allow multiple vehicles without VIN for the same user

set -e

echo "🔧 Starting VIN index fix deployment..."

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

# Check if MongoDB URI is set
if [ -z "$MONGODB_URI" ]; then
    echo "⚠️  Warning: MONGODB_URI not set, using default localhost"
fi

echo "📋 Running VIN index fix..."
node scripts/fix_vin_index.js

if [ $? -eq 0 ]; then
    echo "✅ VIN index fix completed successfully!"
    
    echo "🧪 Running test to verify fix..."
    node scripts/test_vin_fix.js
    
    if [ $? -eq 0 ]; then
        echo "🎉 VIN fix deployment completed successfully!"
        echo "📊 Users can now add multiple vehicles without VIN"
    else
        echo "❌ Test failed! Please check the logs above"
        exit 1
    fi
else
    echo "❌ VIN index fix failed! Please check the logs above"
    exit 1
fi 