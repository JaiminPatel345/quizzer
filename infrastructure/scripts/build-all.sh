#!/bin/bash

set -e  # exit on error
ROOT_DIR=$(pwd)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔨 Building all microservices...${NC}"

SERVICES=("auth-service" "quiz-service" "ai-service" "submission-service" "analytics-service")

for service in "${SERVICES[@]}"; do
    echo -e "${YELLOW}📦 Building $service...${NC}"
    cd "$ROOT_DIR/services/$service"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "${BLUE}Installing dependencies for $service...${NC}"
        yarn install
    fi
    
    # Build the service
    yarn build
    echo -e "${GREEN}✅ $service built successfully${NC}"
done

# Build Docker images
echo -e "${YELLOW}🐳 Building Docker images...${NC}"
for service in "${SERVICES[@]}"; do
    echo -e "${BLUE}Building Docker image for $service...${NC}"
    cd "$ROOT_DIR"
    docker build -t quizzer-$service:latest ./services/$service/
    echo -e "${GREEN}✅ Docker image built for $service${NC}"
done

echo -e "${GREEN}🎉 All services and Docker images built successfully!${NC}"
