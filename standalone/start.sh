#!/bin/bash

# Startup script for AWS Amplify deployment
# Runs the standalone Express server with mock data enabled

export PORT=3000
export MOCK_MODE=true
export NODE_ENV=production

echo "Starting Alert Manager in standalone mode..."
echo "Port: $PORT"
echo "Mock Mode: $MOCK_MODE"

# Start the server
node dist/standalone/server.js
