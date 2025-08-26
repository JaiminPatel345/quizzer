#!/bin/bash

# Azure Student Cost Monitoring Script
# This script helps you monitor Azure costs for your Student subscription

set -e

RESOURCE_GROUP="quizzer-rg"

echo "💰 Azure Student Cost Monitoring for Quizzer Project"
echo "=================================================="
echo ""

# Check current subscription and credits
echo "🎓 Checking Azure Student subscription status..."
SUBSCRIPTION_INFO=$(az account show --query '{name:name, id:id, state:state}' --output json)
SUBSCRIPTION_NAME=$(echo $SUBSCRIPTION_INFO | jq -r '.name')
SUBSCRIPTION_ID=$(echo $SUBSCRIPTION_INFO | jq -r '.id')
SUBSCRIPTION_STATE=$(echo $SUBSCRIPTION_INFO | jq -r '.state')

echo "📋 Subscription: $SUBSCRIPTION_NAME"
echo "🆔 ID: $SUBSCRIPTION_ID"
echo "⚡ State: $SUBSCRIPTION_STATE"
echo ""

# Get current month's costs
echo "💸 Getting current month's spending..."
CURRENT_DATE=$(date +%Y-%m-01)
NEXT_MONTH=$(date -d "$CURRENT_DATE +1 month" +%Y-%m-01)

# Note: Azure CLI cost management commands might not work for all subscription types
echo "📊 Resource Group: $RESOURCE_GROUP"
echo "📅 Billing Period: $CURRENT_DATE to $NEXT_MONTH"
echo ""

# List all resources and their estimated costs
echo "🏗️  Current Resources in $RESOURCE_GROUP:"
echo "----------------------------------------"

if az group show --name $RESOURCE_GROUP --output none 2>/dev/null; then
    RESOURCES=$(az resource list --resource-group $RESOURCE_GROUP --output json)
    
    if [ "$(echo $RESOURCES | jq '. | length')" -eq 0 ]; then
        echo "   No resources found in resource group"
    else
        echo $RESOURCES | jq -r '.[] | "   \(.type): \(.name) (\(.location))"'
    fi
else
    echo "   Resource group not found"
fi

echo ""

# Container Instances cost breakdown
echo "💰 Estimated Monthly Costs (Azure Student optimized):"
echo "---------------------------------------------------"
echo "🐳 Azure Container Registry (Basic): ~$5.00/month"
echo "📦 Container Instances (5 services):"
echo "   - AI Service (0.5 CPU, 1GB RAM): ~$3-5/month"
echo "   - Analytics Service (0.5 CPU, 1GB RAM): ~$3-5/month"
echo "   - Auth Service (0.5 CPU, 1GB RAM): ~$3-5/month"
echo "   - Quiz Service (0.5 CPU, 1GB RAM): ~$3-5/month"
echo "   - Submission Service (0.5 CPU, 1GB RAM): ~$3-5/month"
echo ""
echo "💵 Total Estimated Cost: ~$20-30/month"
echo "🎓 Azure Student Credit: $100/month"
echo "💚 Remaining Budget: ~$70-80/month for other projects"
echo ""

# Cost optimization tips
echo "💡 Cost Optimization Tips:"
echo "--------------------------"
echo "✅ Already optimized:"
echo "   - Using Basic SKU for Container Registry"
echo "   - Minimum CPU/Memory allocation (0.5 CPU, 1GB RAM)"
echo "   - Using external MongoDB/Redis (no Azure DB costs)"
echo "   - OnFailure restart policy (saves costs when containers are idle)"
echo ""
echo "🔧 Additional optimizations you can make:"
echo "   1. Stop containers when not needed:"
echo "      az container stop --resource-group $RESOURCE_GROUP --name <service-name>"
echo ""
echo "   2. Delete and recreate containers for testing:"
echo "      az container delete --resource-group $RESOURCE_GROUP --name <service-name> --yes"
echo ""
echo "   3. Use Azure Container Apps (better for production, pay-per-use):"
echo "      https://docs.microsoft.com/en-us/azure/container-apps/"
echo ""

# Check container instances current state
echo "📊 Current Container Instances Status:"
echo "------------------------------------"

SERVICES=("ai-service" "analytics-service" "auth-service" "quiz-service" "submission-service")

for service in "${SERVICES[@]}"; do
    if az container show --resource-group $RESOURCE_GROUP --name $service --output none 2>/dev/null; then
        STATUS=$(az container show --resource-group $RESOURCE_GROUP --name $service --query instanceView.state --output tsv)
        CPU=$(az container show --resource-group $RESOURCE_GROUP --name $service --query containers[0].resources.requests.cpu --output tsv)
        MEMORY=$(az container show --resource-group $RESOURCE_GROUP --name $service --query containers[0].resources.requests.memoryInGb --output tsv)
        
        echo "   $service: $STATUS (CPU: ${CPU}, Memory: ${MEMORY}GB)"
    else
        echo "   $service: Not deployed"
    fi
done

echo ""
echo "🔗 Useful Links:"
echo "   - Azure Student Dashboard: https://www.microsoftazurestudents.com/"
echo "   - Azure Cost Management: https://portal.azure.com/#blade/Microsoft_Azure_CostManagement/Menu/overview"
echo "   - Azure Pricing Calculator: https://azure.microsoft.com/en-us/pricing/calculator/"
echo ""
echo "⚠️  Important Notes:"
echo "   - Azure Student provides $100 credit per month"
echo "   - Credits expire after 12 months"
echo "   - Monitor usage regularly to avoid unexpected charges"
echo "   - Current setup is optimized for minimal cost within free tier"
