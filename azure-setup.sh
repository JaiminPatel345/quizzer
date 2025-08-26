#!/bin/bash

# Azure Setup Script for Quizzer Microservices
# This script creates all necessary Azure resources for deployment

set -e

# Configuration variables - Optimized for Azure Student/Free Tier
RESOURCE_GROUP="quizzer-rg"
LOCATION="eastus"  # East US has good free tier availability
CONTAINER_REGISTRY="quizzer${USER}$(shuf -i 100-999 -n 1)"  # Generate unique registry name
SUBSCRIPTION_ID=""  # Will be fetched automatically

echo "🎓 Starting Azure setup for Quizzer microservices (Azure Student optimized)..."

# Function to check if resource exists
resource_exists() {
    local resource_type=$1
    local resource_name=$2
    local resource_group=$3
    
    if [ -z "$resource_group" ]; then
        az $resource_type show --name "$resource_name" --output none 2>/dev/null
    else
        az $resource_type show --name "$resource_name" --resource-group "$resource_group" --output none 2>/dev/null
    fi
}

# Get current subscription ID
echo "📋 Getting current Azure subscription..."
SUBSCRIPTION_ID=$(az account show --query id --output tsv)
echo "✅ Using subscription: $SUBSCRIPTION_ID"

# Create resource group if it doesn't exist
echo "📦 Creating resource group..."
if resource_exists group $RESOURCE_GROUP; then
    echo "✅ Resource group '$RESOURCE_GROUP' already exists"
else
    az group create --name $RESOURCE_GROUP --location $LOCATION
    echo "✅ Resource group '$RESOURCE_GROUP' created"
fi

# Create container registry if it doesn't exist
echo "🐳 Creating Azure Container Registry (Basic SKU for cost optimization)..."

# Check if registry name is available
check_registry_name() {
    local registry_name=$1
    az acr check-name --name "$registry_name" --query nameAvailable --output tsv 2>/dev/null
}

# Find an available registry name
find_available_registry_name() {
    local base_name="quizzer${USER}"
    local counter=1
    local registry_name="${base_name}$(shuf -i 100-999 -n 1)"
    
    while [ "$(check_registry_name $registry_name)" != "true" ] && [ $counter -le 10 ]; do
        registry_name="${base_name}$(shuf -i 100-999 -n 1)"
        counter=$((counter + 1))
    done
    
    if [ "$(check_registry_name $registry_name)" = "true" ]; then
        echo "$registry_name"
    else
        echo ""
    fi
}

# Check if we already have a registry in this resource group
existing_registry=$(az acr list --resource-group $RESOURCE_GROUP --query "[0].name" --output tsv 2>/dev/null)

if [ -n "$existing_registry" ] && [ "$existing_registry" != "null" ]; then
    CONTAINER_REGISTRY="$existing_registry"
    echo "✅ Using existing container registry '$CONTAINER_REGISTRY'"
else
    # Find an available name
    echo "🔍 Finding available registry name..."
    available_name=$(find_available_registry_name)
    
    if [ -n "$available_name" ]; then
        CONTAINER_REGISTRY="$available_name"
        echo "📝 Using registry name: $CONTAINER_REGISTRY"
        
        az acr create \
            --resource-group $RESOURCE_GROUP \
            --name $CONTAINER_REGISTRY \
            --sku Basic \
            --admin-enabled true \
            --location $LOCATION
        echo "✅ Container registry '$CONTAINER_REGISTRY' created with Basic SKU"
    else
        echo "❌ Could not find an available registry name. Please try again or choose a different base name."
        exit 1
    fi
fi

# Get registry credentials
echo "🔑 Getting registry credentials..."
REGISTRY_USERNAME=$(az acr credential show --name $CONTAINER_REGISTRY --query username --output tsv)
REGISTRY_PASSWORD=$(az acr credential show --name $CONTAINER_REGISTRY --query passwords[0].value --output tsv)

echo "✅ Registry credentials retrieved"

# Create service principal for GitHub Actions
echo "👤 Creating service principal for GitHub Actions..."
SP_NAME="sp-quizzer-github-actions"

# Check if service principal already exists
if az ad sp list --display-name "$SP_NAME" --query "[0].appId" --output tsv | grep -q "."; then
    echo "✅ Service principal '$SP_NAME' already exists"
    SP_APP_ID=$(az ad sp list --display-name "$SP_NAME" --query "[0].appId" --output tsv)
else
    # Create service principal with contributor role
    SP_CREDENTIALS=$(az ad sp create-for-rbac \
        --name "$SP_NAME" \
        --role contributor \
        --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" \
        --sdk-auth)
    
    SP_APP_ID=$(echo $SP_CREDENTIALS | jq -r '.clientId')
    echo "✅ Service principal '$SP_NAME' created"
fi

# Assign AcrPush role to service principal for the container registry
echo "🔐 Assigning AcrPush role to service principal..."
az role assignment create \
    --assignee $SP_APP_ID \
    --role AcrPush \
    --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.ContainerRegistry/registries/$CONTAINER_REGISTRY" \
    --output none 2>/dev/null || echo "⚠️  Role assignment might already exist"

echo "✅ AcrPush role assigned"

# Get service principal credentials for GitHub secrets
echo "🔑 Getting service principal credentials..."
if [ -z "${SP_CREDENTIALS:-}" ]; then
    # Service principal already existed, need to create new credentials
    SP_CREDENTIALS=$(az ad sp credential reset --id $SP_APP_ID --sdk-auth)
fi

echo ""
echo "🎉 Azure setup completed successfully!"
echo ""
echo "� COST OPTIMIZATION NOTES:"
echo "   - Using Azure Container Registry Basic SKU: ~$5/month"
echo "   - Container Instances with 0.5 CPU, 1GB RAM per service"
echo "   - Estimated total cost: ~$15-25/month (well within Azure Student $100 credit)"
echo "   - Using external MongoDB/Redis (no Azure database costs)"
echo ""
echo "�📝 Please add the following secrets to your GitHub repository:"
echo "   Go to: https://github.com/JaiminPatel345/quizzer/settings/secrets/actions"
echo ""
echo "Secret Name: AZURE_CREDENTIALS"
echo "Secret Value:"
echo "$SP_CREDENTIALS"
echo ""
echo "Secret Name: REGISTRY_USERNAME"
echo "Secret Value: $REGISTRY_USERNAME"
echo ""
echo "Secret Name: REGISTRY_PASSWORD"
echo "Secret Value: $REGISTRY_PASSWORD"
echo ""
echo "Secret Name: CONTAINER_REGISTRY_NAME"
echo "Secret Value: $CONTAINER_REGISTRY"
echo ""
echo "🔗 Your Azure Container Registry URL: ${CONTAINER_REGISTRY}.azurecr.io"
echo ""
echo "📍 Resource Group: $RESOURCE_GROUP"
echo "📍 Location: $LOCATION"
echo ""
echo "💡 COST MONITORING:"
echo "   - Check your Azure Student credits: https://www.microsoftazurestudents.com/"
echo "   - Monitor costs: https://portal.azure.com/#blade/Microsoft_Azure_CostManagement/Menu/overview"
echo ""
echo "🚀 After adding these secrets, push to the 'microservices' branch to trigger deployment!"
