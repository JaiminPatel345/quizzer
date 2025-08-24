#!/bin/bash

# Simple Docker Build and Run Script
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found in root directory${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Building and running Quizzer services...${NC}"

# Services with ports
declare -A services=(
    ["ai-service"]="3001"
    ["quiz-service"]="3002"
    ["auth-service"]="3003"
    ["analytics-service"]="3004"
    ["submission-service"]="3005"
)

# Function to stop all containers
stop_all() {
    echo -e "${YELLOW}🛑 Stopping all services...${NC}"
    for service in "${!services[@]}"; do
        docker stop "quizzer-$service" 2>/dev/null || true
        docker rm "quizzer-$service" 2>/dev/null || true
    done
}

# Handle script interruption
trap stop_all EXIT

# Command handling
case "${1:-run}" in
    "build")
        echo -e "${YELLOW}🔨 Building all services...${NC}"
        for service in "${!services[@]}"; do
            echo -e "${BLUE}Building $service...${NC}"
            docker build -t "quizzer-$service:latest" "./services/$service/"
            echo -e "${GREEN}✅ $service built${NC}"
        done
        ;;

    "run")
        echo -e "${YELLOW}🏃 Starting all services...${NC}"
        for service in "${!services[@]}"; do
            port=${services[$service]}
            echo -e "${BLUE}Starting $service on port $port...${NC}"

            docker run -d \
                --name "quizzer-$service" \
                --env-file .env \
                -p "$port:$port" \
                --restart unless-stopped \
                "quizzer-$service:latest"

            echo -e "${GREEN}✅ $service running on http://localhost:$port${NC}"
        done

        echo -e "${GREEN}🎉 All services are running!${NC}"
        echo -e "${BLUE}📋 Services:${NC}"
        for service in "${!services[@]}"; do
            port=${services[$service]}
            echo -e "${CYAN}  $service: http://localhost:$port${NC}"
        done
        ;;

    "stop")
        stop_all
        echo -e "${GREEN}✅ All services stopped${NC}"
        ;;

    "restart")
        stop_all
        sleep 2
        $0 run
        ;;

    "logs")
        service_name=${2:-}
        if [ -n "$service_name" ]; then
            docker logs -f "quizzer-$service_name"
        else
            echo -e "${BLUE}📋 Available services:${NC}"
            for service in "${!services[@]}"; do
                echo "  $service"
            done
            echo -e "${YELLOW}Usage: $0 logs <service-name>${NC}"
        fi
        ;;

    "status")
        echo -e "${BLUE}📊 Service Status:${NC}"
        for service in "${!services[@]}"; do
            if docker ps --filter "name=quizzer-$service" --format "table {{.Names}}\t{{.Status}}" | grep -q "quizzer-$service"; then
                echo -e "${GREEN}✅ $service: Running${NC}"
            else
                echo -e "${RED}❌ $service: Stopped${NC}"
            fi
        done
        ;;

    "clean")
        stop_all
        echo -e "${YELLOW}🧹 Cleaning up images...${NC}"
        docker rmi $(docker images "quizzer-*" -q) 2>/dev/null || true
        echo -e "${GREEN}✅ Cleanup complete${NC}"
        ;;

    *)
        echo -e "${BLUE}🔧 Usage:${NC}"
        echo "  $0 build    - Build all services"
        echo "  $0 run      - Run all services (default)"
        echo "  $0 stop     - Stop all services"
        echo "  $0 restart  - Restart all services"
        echo "  $0 logs <service> - Show logs for service"
        echo "  $0 status   - Show service status"
        echo "  $0 clean    - Stop and remove all containers/images"
        ;;
esac