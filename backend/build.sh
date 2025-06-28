#!/bin/bash
set -e

echo "Starting build process..."
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

echo "Building TypeScript..."
tsccmd="./node_modules/.bin/tsc"
if [ ! -f "$tsccmd" ]; then
  echo "TypeScript not found in node_modules, installing..."
  npm install typescript@~5.7.2
fi
$tsccmd

echo "Build completed. Checking dist directory:"
ls -la dist/ || echo "dist directory not found!"

echo "Build script finished." 