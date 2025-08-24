#!/bin/bash

MODE=${1:-dev}

echo "🛑 Stopping Quiz Microservices in $MODE mode..."

if [ "$MODE" = "dev" ]; then
    echo "🛑 Stopping infrastructure services..."
    docker-compose down

    echo "🛑 Stopping node services..."
    # Kill concurrently processes by name
    pkill -f "concurrently"
    pkill -f "yarn dev"
else
    echo "🐳 Stopping all services with Docker Compose..."
    docker-compose down
fi

echo "✅ All services stopped!"
