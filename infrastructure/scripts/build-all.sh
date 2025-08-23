#!/bin/bash

echo "🔨 Building all microservices..."

SERVICES=("auth-service" "quiz-service" "ai-service" "submission-service" "analytics-service" "notification-service")

for service in "${SERVICES[@]}"; do
    echo "📦 Building $service..."
    cd "services/$service"
    npm run build
    cd "../.."
done

echo "✅ All services built successfully!"
