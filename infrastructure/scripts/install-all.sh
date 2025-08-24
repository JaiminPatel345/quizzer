#!/bin/bash

ROOT_DIR=$(pwd)
echo "📦 Installing Microservices Node modules..."

SERVICES=("auth-service" "quiz-service" "ai-service" "submission-service" "analytics-service" )

for service in "${SERVICES[@]}"; do
    echo "📦 Installing $service..."
    cd "$ROOT_DIR/services/$service"
    yarn build
done

echo "✅ All node_modules installs successfully!"