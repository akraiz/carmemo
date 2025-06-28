#!/bin/bash
echo "Starting build process..."
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

echo "Installing dependencies..."
npm install --include=dev

echo "Checking if TypeScript is available..."
if [ -f "./node_modules/.bin/tsc" ]; then
    echo "TypeScript found in node_modules/.bin/"
    TSC_CMD="./node_modules/.bin/tsc"
elif command -v tsc &> /dev/null; then
    echo "TypeScript found in PATH"
    TSC_CMD="tsc"
else
    echo "TypeScript not found, installing locally..."
    npm install typescript@~5.7.2
    TSC_CMD="./node_modules/.bin/tsc"
fi

echo "Building TypeScript..."
$TSC_CMD

echo "Build completed. Checking dist directory:"
ls -la dist/ || echo "dist directory not found!"

echo "Build script finished." 