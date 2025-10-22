#!/bin/bash

# RAG Chatbot Backend Startup Script
echo "Starting RAG Chatbot Backend..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is required but not installed."
    exit 1
fi

# Ensure pip is available for installing pdm if needed
if ! command -v pip3 &> /dev/null; then
    echo "pip3 is required but not installed."
    exit 1
fi

# Navigate to backend directory
cd backend

# Ensure pdm is installed
if ! command -v pdm &> /dev/null; then
    echo "pdm not found. Installing pdm..."
    pip3 install --user pdm
    export PATH="$HOME/.local/bin:$PATH"
fi

echo "Installing project dependencies with pdm (will create an in-project venv)..."
pdm install

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp env.example .env
    echo "Please edit .env file and add your Gemini API key"
fi

echo "Starting FastAPI server via pdm..."
echo "Backend will be available at: http://localhost:8000"
echo "API documentation: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the server"

# Use pdm run to execute the script defined in pyproject.toml
pdm run start
