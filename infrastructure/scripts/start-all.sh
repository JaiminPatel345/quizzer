#!/bin/bash

MODE=${1:-dev}

echo "🚀 Starting Quiz Microservices in $MODE mode..."

if [ "$MODE" = "dev" ]; then
    echo "📦 Starting infrastructure services..."
    docker-compose up -d mongodb redis

    echo "⏳ Waiting for infrastructure to be ready..."
    sleep 5

    echo "🔧 Starting development services..."
    # Use concurrently to run all services in development
    npx concurrently \
        --prefix "[{name}]" \
        --names "auth,quiz,ai,submission,analytics" \
        --prefix-colors "blue,green,yellow,cyan,magenta" \
        "cd services/auth-service && yarn dev" \
        "cd services/quiz-service && yarn dev" \
        "cd services/ai-service && yarn dev" \
        "cd services/submission-service && yarn dev" \
        "cd services/analytics-service && yarn dev"
else
    echo "🐳 Starting all services with Docker Compose..."
    docker-compose up -d
fi
