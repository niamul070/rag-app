#!/bin/bash

# RAG Chatbot Frontend Startup Script
echo "Starting RAG Chatbot Frontend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is required but not installed."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is required but not installed."
    exit 1
fi

# Navigate to frontend directory
cd frontend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the frontend development server
echo "Starting React development server..."
echo "Frontend will be available at: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"

npm start
