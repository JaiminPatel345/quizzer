#!/bin/bash

# Azure Cleanup Script for Quizzer Microservices
# This script removes all Azure resources created for the project

set -e

RESOURCE_GROUP="quizzer-rg"
CONTAINER_REGISTRY=$(az acr list --resource-group $RESOURCE_GROUP --query "[0].name" --output tsv 2>/dev/null)
SP_NAME="sp-quizzer-github-actions"

echo "🗑️  Azure cleanup script for Quizzer microservices"
echo ""
echo "⚠️  WARNING: This will delete ALL Azure resources for this project!"
echo "This includes:"
echo "  - Resource Group: $RESOURCE_GROUP"
if [ -n "$CONTAINER_REGISTRY" ] && [ "$CONTAINER_REGISTRY" != "null" ]; then
    echo "  - Container Registry: $CONTAINER_REGISTRY"
else
    echo "  - Container Registry: (will be detected automatically)"
fi
echo "  - All Container Instances"
echo "  - Service Principal: $SP_NAME"
echo ""

read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Cleanup cancelled"
    exit 0
fi

echo ""
echo "🧹 Starting cleanup process..."

# Delete resource group (this will delete all resources within it)
echo "🗑️  Deleting resource group and all contained resources..."
if az group show --name $RESOURCE_GROUP --output none 2>/dev/null; then
    az group delete --name $RESOURCE_GROUP --yes --no-wait
    echo "✅ Resource group deletion initiated (this may take a few minutes)"
else
    echo "ℹ️  Resource group '$RESOURCE_GROUP' not found"
fi

# Delete service principal
echo "👤 Deleting service principal..."
SP_APP_ID=$(az ad sp list --display-name "$SP_NAME" --query "[0].appId" --output tsv 2>/dev/null)

if [ -n "$SP_APP_ID" ] && [ "$SP_APP_ID" != "null" ]; then
    az ad sp delete --id $SP_APP_ID
    echo "✅ Service principal '$SP_NAME' deleted"
else
    echo "ℹ️  Service principal '$SP_NAME' not found"
fi

echo ""
echo "🎉 Cleanup process completed!"
echo ""
echo "📝 Don't forget to:"
echo "  1. Remove GitHub repository secrets (AZURE_CREDENTIALS, REGISTRY_USERNAME, REGISTRY_PASSWORD)"
echo "  2. Check Azure portal to ensure all resources are deleted"
echo ""
echo "💡 You can verify the cleanup by running:"
echo "   az group show --name $RESOURCE_GROUP"
echo "   (This should return an error if the group is deleted)"
