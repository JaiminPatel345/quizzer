#!/bin/bash

# Local Development Helper Script
# This script helps manage your Docker Compose environment for local development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if .env file exists
check_env_file() {
    if [ ! -f .env ]; then
        print_error ".env file not found. Please create it from the template."
        exit 1
    fi
}

# Function to build all services
build_services() {
    print_status "Building all services..."
    docker-compose build --no-cache
    print_success "All services built successfully!"
}

# Function to start services
start_services() {
    print_status "Starting all services..."
    docker-compose up -d
    print_success "All services started!"

    # Wait a moment for services to start
    sleep 5

    # Show service status
    docker-compose ps
}

# Function to stop services
stop_services() {
    print_status "Stopping all services..."
    docker-compose down
    print_success "All services stopped!"
}

# Function to view logs
view_logs() {
    if [ -z "$1" ]; then
        print_status "Showing logs for all services..."
        docker-compose logs -f
    else
        print_status "Showing logs for $1..."
        docker-compose logs -f "$1"
    fi
}

# Function to restart a specific service
restart_service() {
    if [ -z "$1" ]; then
        print_error "Please specify a service name to restart"
        exit 1
    fi

    print_status "Restarting $1..."
    docker-compose restart "$1"
    print_success "$1 restarted successfully!"
}

# Function to clean up everything
cleanup() {
    print_warning "This will remove all containers, volumes, and networks"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleaning up..."
        docker-compose down -v --remove-orphans
        docker system prune -f
        print_success "Cleanup completed!"
    fi
}

# Function to show service health
health_check() {
    print_status "Checking service health..."

    services=("auth-service" "ai-service" "quiz-service" "analytics-service" "submission-service")
    ports=(3001 3002 3003 3004 3005)

    for i in "${!services[@]}"; do
        service="${services[$i]}"
        port="${ports[$i]}"

        if curl -f -s "http://localhost:$port/health" > /dev/null 2>&1; then
            print_success "$service is healthy (port $port)"
        else
            print_error "$service is not responding (port $port)"
        fi
    done
}

# Function to build TypeScript for all services
build_typescript() {
    print_status "Building TypeScript for all services..."

    services=("auth-service" "ai-service" "quiz-service" "analytics-service" "submission-service")

    for service in "${services[@]}"; do
        if [ -d "services/$service" ]; then
            print_status "Building $service..."
            cd "services/$service"
            npm run build
            cd ../..
            print_success "$service built successfully!"
        fi
    done
}

# Main script logic
case "${1:-help}" in
    "start")
        check_env_file
        start_services
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        check_env_file
        stop_services
        start_services
        ;;
    "build")
        check_env_file
        build_services
        ;;
    "build-ts")
        build_typescript
        ;;
    "logs")
        view_logs "$2"
        ;;
    "restart-service")
        restart_service "$2"
        ;;
    "health")
        health_check
        ;;
    "cleanup")
        cleanup
        ;;
    "status")
        docker-compose ps
        ;;
    *)
        echo "Local Development Helper for Quizzer Platform"
        echo ""
        echo "Usage: $0 {command} [options]"
        echo ""
        echo "Commands:"
        echo "  start           - Start all services"
        echo "  stop            - Stop all services"
        echo "  restart         - Restart all services"
        echo "  build           - Build all Docker images"
        echo "  build-ts        - Build TypeScript for all services"
        echo "  logs [service]  - View logs (all services or specific service)"
        echo "  restart-service <service> - Restart a specific service"
        echo "  health          - Check health of all services"
        echo "  status          - Show service status"
        echo "  cleanup         - Remove all containers and volumes"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 logs auth-service"
        echo "  $0 restart-service ai-service"
        echo "  $0 health"
        ;;
esac
