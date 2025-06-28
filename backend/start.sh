#!/bin/bash
echo "Starting CarMemo Backend..."
echo "Current directory: $(pwd)"
echo "Listing dist directory:"
ls -la dist/
echo "Running proxy-server.js..."
node dist/proxy-server.js 