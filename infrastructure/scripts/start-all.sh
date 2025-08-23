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
        --names "auth,quiz,ai,submission,analytics,notification" \
        --prefix-colors "blue,green,yellow,red,magenta,cyan" \
        "cd services/auth-service && npm run dev" \
        "cd services/quiz-service && npm run dev" \
        "cd services/ai-service && npm run dev" \
        "cd services/submission-service && npm run dev" \
        "cd services/analytics-service && npm run dev" \
        "cd services/notification-service && npm run dev"
else
    echo "🐳 Starting all services with Docker Compose..."
    docker-compose up -d
fi
