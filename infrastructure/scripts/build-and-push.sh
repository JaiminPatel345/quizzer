#!/bin/bash

# Build and Push Docker Images to Azure Container Registry
# Usage: ./build-and-push.sh <registry-name> [tag]

set -e

REGISTRY_NAME=$1
TAG=${2:-latest}

if [ -z "$REGISTRY_NAME" ]; then
    echo "Usage: $0 <registry-name> [tag]"
    echo "Example: $0 myregistry.azurecr.io latest"
    exit 1
fi

echo "🔨 Building and pushing Docker images to $REGISTRY_NAME with tag $TAG"

# Services array
SERVICES=("auth-service" "quiz-service" "ai-service" "submission-service" "analytics-service")

# Login to Azure Container Registry
echo "🔐 Logging into Azure Container Registry..."
az acr login --name $(echo $REGISTRY_NAME | cut -d'.' -f1)

# Build and push each service
for SERVICE in "${SERVICES[@]}"; do
    echo "📦 Building $SERVICE..."

    # Build the image
    docker build -t $REGISTRY_NAME/quizzer-$SERVICE:$TAG ./services/$SERVICE/

    # Push the image
    echo "🚀 Pushing $SERVICE to registry..."
    docker push $REGISTRY_NAME/quizzer-$SERVICE:$TAG

    echo "✅ $SERVICE built and pushed successfully"
done

echo "🎉 All images built and pushed successfully!"
echo ""
echo "Images pushed:"
for SERVICE in "${SERVICES[@]}"; do
    echo "  - $REGISTRY_NAME/quizzer-$SERVICE:$TAG"
done
