#!/bin/bash

set -e  # exit on error
ROOT_DIR=$(pwd)

echo "🔨 Building all microservices..."

SERVICES=("auth-service" "quiz-service" "ai-service" "submission-service" "analytics-service")

for service in "${SERVICES[@]}"; do
    echo "📦 Building $service..."
    cd "$ROOT_DIR/services/$service"
    yarn build
done

echo "✅ All services built successfully!"
