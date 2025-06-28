#!/bin/bash
echo "Starting build process..."
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

echo "Installing dependencies..."
npm install --include=dev

echo "Checking if TypeScript is available..."
if ! command -v tsc &> /dev/null; then
    echo "TypeScript not found in PATH, installing locally..."
    npm install typescript@~5.7.2
fi

echo "Building TypeScript..."
if command -v tsc &> /dev/null; then
    tsc
elif [ -f "./node_modules/.bin/tsc" ]; then
    ./node_modules/.bin/tsc
else
    echo "Installing TypeScript globally and trying again..."
    npm install -g typescript@~5.7.2
    tsc
fi

echo "Build completed. Checking dist directory:"
ls -la dist/ || echo "dist directory not found!"

echo "Build script finished." 