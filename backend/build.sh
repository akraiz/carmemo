#!/bin/bash
echo "Starting build process..."
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

echo "Installing dependencies..."
npm install

echo "Building TypeScript..."
npm run build

echo "Build completed. Checking dist directory:"
ls -la dist/ || echo "dist directory not found!"

echo "Build script finished." 