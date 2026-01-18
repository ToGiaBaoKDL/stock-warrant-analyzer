#!/bin/bash
# Start script for Stock Warrant Analyzer Backend
# Usage: ./start.sh [dev|prod]

set -e

MODE=${1:-prod}

echo "Starting Stock Warrant Analyzer Backend in $MODE mode..."

# Activate virtual environment if exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Install dependencies if needed
if [ ! -f ".deps_installed" ]; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
    touch .deps_installed
fi

# Get port from environment or default
PORT=${PORT:-8000}
HOST=${HOST:-0.0.0.0}
WORKERS=${WORKERS:-1}

if [ "$MODE" = "dev" ]; then
    echo "Running in development mode with hot reload..."
    exec uvicorn app.main:app --host $HOST --port $PORT --reload
else
    echo "Running in production mode..."
    exec uvicorn app.main:app --host $HOST --port $PORT --workers $WORKERS
fi
