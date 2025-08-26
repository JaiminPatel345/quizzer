#!/bin/bash

# Azure Deployment Verification Script
# This script checks the status of all deployed services

set -e

RESOURCE_GROUP="quizzer-rg"
SERVICES=("ai-service" "analytics-service" "auth-service" "quiz-service" "submission-service")

echo "🔍 Checking deployment status for Quizzer microservices..."
echo ""

for service in "${SERVICES[@]}"; do
    echo "📦 Checking $service..."
    
    # Check if container instance exists
    if az container show --resource-group $RESOURCE_GROUP --name $service --output none 2>/dev/null; then
        # Get container status
        status=$(az container show --resource-group $RESOURCE_GROUP --name $service --query instanceView.state --output tsv)
        
        # Get container IP
        ip=$(az container show --resource-group $RESOURCE_GROUP --name $service --query ipAddress.ip --output tsv)
        
        # Get port from the service name mapping
        case $service in
            "ai-service")
                port="3001"
                ;;
            "analytics-service")
                port="3002"
                ;;
            "auth-service")
                port="3003"
                ;;
            "quiz-service")
                port="3004"
                ;;
            "submission-service")
                port="3005"
                ;;
        esac
        
        echo "   Status: $status"
        echo "   IP: $ip"
        echo "   URL: http://$ip:$port"
        
        # Test health endpoint if service is running
        if [ "$status" = "Running" ]; then
            echo "   Testing health endpoint..."
            if curl -f "http://$ip:$port/health" --connect-timeout 5 --max-time 10 > /dev/null 2>&1; then
                echo "   ✅ Health check passed"
            else
                echo "   ⚠️  Health check failed (endpoint might not be implemented)"
            fi
        else
            echo "   ❌ Service not running"
        fi
    else
        echo "   ❌ Container instance not found"
    fi
    echo ""
done

# Check container registry
echo "🐳 Checking Container Registry..."
CONTAINER_REGISTRY=$(az acr list --resource-group $RESOURCE_GROUP --query "[0].name" --output tsv 2>/dev/null)

if [ -n "$CONTAINER_REGISTRY" ] && [ "$CONTAINER_REGISTRY" != "null" ]; then
    echo "✅ Container Registry '$CONTAINER_REGISTRY' is available"
    
    # List recent images
    echo "📋 Recent images in registry:"
    az acr repository list --name $CONTAINER_REGISTRY --output table 2>/dev/null || echo "   No repositories found yet"
else
    echo "❌ Container Registry not found"
fi

echo ""
echo "🔗 To view logs for a specific service:"
echo "   az container logs --resource-group $RESOURCE_GROUP --name <service-name>"
echo ""
echo "🔄 To restart a service:"
echo "   az container restart --resource-group $RESOURCE_GROUP --name <service-name>"
echo ""
echo "🗑️  To delete all resources:"
echo "   az group delete --name $RESOURCE_GROUP --yes --no-wait"
