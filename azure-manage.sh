#!/bin/bash

# Azure Container Management Script
# This script helps you start/stop containers to save costs

set -e

RESOURCE_GROUP="quizzer-rg"
SERVICES=("ai-service" "analytics-service" "auth-service" "quiz-service" "submission-service")

show_help() {
    echo "Azure Container Management for Cost Optimization"
    echo "=============================================="
    echo ""
    echo "Usage: $0 [command] [service-name]"
    echo ""
    echo "Commands:"
    echo "  start [service]     Start a specific service or all services"
    echo "  stop [service]      Stop a specific service or all services"
    echo "  restart [service]   Restart a specific service or all services"
    echo "  status              Show status of all services"
    echo "  logs [service]      Show logs for a specific service"
    echo "  help                Show this help message"
    echo ""
    echo "Services:"
    echo "  ai-service, analytics-service, auth-service, quiz-service, submission-service"
    echo ""
    echo "Examples:"
    echo "  $0 status                    # Show all services status"
    echo "  $0 stop                      # Stop all services"
    echo "  $0 start                     # Start all services"
    echo "  $0 stop ai-service           # Stop only AI service"
    echo "  $0 logs auth-service         # Show auth service logs"
    echo ""
    echo "💡 Cost Saving Tips:"
    echo "   - Stop services when not in use to save money"
    echo "   - Azure Student gives \$100/month credit"
    echo "   - Running all services 24/7: ~\$20-30/month"
    echo "   - Running only when needed: ~\$5-10/month"
}

check_service_exists() {
    local service=$1
    if ! az container show --resource-group $RESOURCE_GROUP --name $service --output none 2>/dev/null; then
        echo "❌ Service '$service' not found in resource group '$RESOURCE_GROUP'"
        return 1
    fi
    return 0
}

get_service_status() {
    local service=$1
    if check_service_exists $service; then
        az container show --resource-group $RESOURCE_GROUP --name $service --query instanceView.state --output tsv
    else
        echo "NotFound"
    fi
}

start_service() {
    local service=$1
    echo "🚀 Starting $service..."
    
    if ! check_service_exists $service; then
        return 1
    fi
    
    STATUS=$(get_service_status $service)
    if [ "$STATUS" = "Running" ]; then
        echo "✅ $service is already running"
    else
        az container start --resource-group $RESOURCE_GROUP --name $service
        echo "✅ $service started"
    fi
}

stop_service() {
    local service=$1
    echo "🛑 Stopping $service..."
    
    if ! check_service_exists $service; then
        return 1
    fi
    
    STATUS=$(get_service_status $service)
    if [ "$STATUS" = "Terminated" ] || [ "$STATUS" = "Stopped" ]; then
        echo "✅ $service is already stopped"
    else
        az container stop --resource-group $RESOURCE_GROUP --name $service
        echo "✅ $service stopped"
    fi
}

restart_service() {
    local service=$1
    echo "🔄 Restarting $service..."
    
    if ! check_service_exists $service; then
        return 1
    fi
    
    az container restart --resource-group $RESOURCE_GROUP --name $service
    echo "✅ $service restarted"
}

show_status() {
    echo "📊 Current Status of All Services:"
    echo "================================="
    echo ""
    
    local total_running=0
    local total_stopped=0
    
    for service in "${SERVICES[@]}"; do
        STATUS=$(get_service_status $service)
        
        case $STATUS in
            "Running")
                echo "🟢 $service: Running"
                ((total_running++))
                ;;
            "Terminated"|"Stopped")
                echo "🔴 $service: Stopped"
                ((total_stopped++))
                ;;
            "NotFound")
                echo "❌ $service: Not deployed"
                ;;
            *)
                echo "🟡 $service: $STATUS"
                ;;
        esac
    done
    
    echo ""
    echo "📈 Summary:"
    echo "   Running: $total_running services"
    echo "   Stopped: $total_stopped services"
    echo ""
    
    if [ $total_running -gt 0 ]; then
        echo "💰 Estimated current hourly cost: \$$(echo "scale=3; $total_running * 0.015" | bc -l)/hour"
        echo "💰 Estimated monthly cost (if kept running): \$$(echo "scale=2; $total_running * 10.8" | bc -l)/month"
    else
        echo "💚 All services stopped - minimal costs!"
    fi
}

show_logs() {
    local service=$1
    echo "📋 Showing logs for $service..."
    
    if ! check_service_exists $service; then
        return 1
    fi
    
    az container logs --resource-group $RESOURCE_GROUP --name $service
}

# Main script logic
COMMAND=${1:-help}
SERVICE=$2

case $COMMAND in
    "start")
        if [ -n "$SERVICE" ]; then
            start_service $SERVICE
        else
            echo "🚀 Starting all services..."
            for service in "${SERVICES[@]}"; do
                start_service $service
            done
            echo ""
            echo "✅ All services start command sent"
        fi
        ;;
    "stop")
        if [ -n "$SERVICE" ]; then
            stop_service $SERVICE
        else
            echo "🛑 Stopping all services..."
            for service in "${SERVICES[@]}"; do
                stop_service $service
            done
            echo ""
            echo "✅ All services stop command sent"
            echo "💰 This will significantly reduce your Azure costs!"
        fi
        ;;
    "restart")
        if [ -n "$SERVICE" ]; then
            restart_service $SERVICE
        else
            echo "🔄 Restarting all services..."
            for service in "${SERVICES[@]}"; do
                restart_service $service
            done
            echo ""
            echo "✅ All services restart command sent"
        fi
        ;;
    "status")
        show_status
        ;;
    "logs")
        if [ -n "$SERVICE" ]; then
            show_logs $SERVICE
        else
            echo "❌ Please specify a service name for logs"
            echo "Available services: ${SERVICES[*]}"
        fi
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo "❌ Unknown command: $COMMAND"
        echo ""
        show_help
        exit 1
        ;;
esac
