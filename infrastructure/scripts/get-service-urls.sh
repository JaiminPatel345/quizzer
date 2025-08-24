#!/bin/bash

# Script to get all deployed Azure Container Apps URLs
# Run this after deployment to get all service URLs

echo "🌐 Getting All Azure Container Apps URLs"
echo "========================================"

# Your Azure configuration
RESOURCE_GROUP="quizzer"
RESOURCE_GROUP_STAGING="quizzer-staging"

# Check if logged in
if ! az account show > /dev/null 2>&1; then
    echo "❌ Not logged into Azure. Please run 'az login' first."
    exit 1
fi

echo "✅ Logged into Azure"
echo ""

# Function to get container app URL
get_app_url() {
    local app_name=$1
    local resource_group=$2
    local url=$(az containerapp show --name $app_name --resource-group $resource_group --query "properties.configuration.ingress.fqdn" --output tsv 2>/dev/null)
    if [ -n "$url" ] && [ "$url" != "null" ]; then
        echo "✅ $app_name: https://$url"
    else
        echo "❌ $app_name: Not deployed or not found"
    fi
}

# Production URLs
echo "🚀 PRODUCTION URLS (Resource Group: $RESOURCE_GROUP)"
echo "=================================================="
get_app_url "quizzer-auth-service" $RESOURCE_GROUP
get_app_url "quizzer-quiz-service" $RESOURCE_GROUP
get_app_url "quizzer-ai-service" $RESOURCE_GROUP
get_app_url "quizzer-analytics-service" $RESOURCE_GROUP
get_app_url "quizzer-submission-service" $RESOURCE_GROUP
get_app_url "quizzer-gateway" $RESOURCE_GROUP
echo ""

# Staging URLs
echo "🧪 STAGING URLS (Resource Group: $RESOURCE_GROUP_STAGING)"
echo "======================================================="
get_app_url "quizzer-auth-service-staging" $RESOURCE_GROUP_STAGING
get_app_url "quizzer-quiz-service-staging" $RESOURCE_GROUP_STAGING
get_app_url "quizzer-ai-service-staging" $RESOURCE_GROUP_STAGING
get_app_url "quizzer-analytics-service-staging" $RESOURCE_GROUP_STAGING
get_app_url "quizzer-submission-service-staging" $RESOURCE_GROUP_STAGING
echo ""

# List all container apps in both resource groups
echo "📋 ALL CONTAINER APPS"
echo "===================="
echo "Production:"
az containerapp list --resource-group $RESOURCE_GROUP --query "[].{Name:name, FQDN:properties.configuration.ingress.fqdn, Status:properties.provisioningState}" --output table 2>/dev/null || echo "No apps found in production"

echo ""
echo "Staging:"
az containerapp list --resource-group $RESOURCE_GROUP_STAGING --query "[].{Name:name, FQDN:properties.configuration.ingress.fqdn, Status:properties.provisioningState}" --output table 2>/dev/null || echo "No apps found in staging"

echo ""
echo "💡 Tips:"
echo "- Each service has its own unique URL"
echo "- Use the gateway URL as your main entry point"
echo "- Health check endpoints: {service-url}/health"
echo "- API documentation: {service-url}/api-docs (if implemented)"
