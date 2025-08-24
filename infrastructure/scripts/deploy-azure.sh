#!/bin/bash

# Deploy Quizzer Microservices to Azure Container Apps
# Usage: ./deploy-azure.sh <resource-group> <registry-name> [location]

set -e

RESOURCE_GROUP=$1
REGISTRY_NAME=$2
LOCATION=${3:-eastus}
DEPLOYMENT_NAME="quizzer-deployment-$(date +%Y%m%d-%H%M%S)"

if [ -z "$RESOURCE_GROUP" ] || [ -z "$REGISTRY_NAME" ]; then
    echo "Usage: $0 <resource-group> <registry-name> [location]"
    echo "Example: $0 quizzer-rg myregistry.azurecr.io eastus"
    exit 1
fi

echo "🚀 Deploying Quizzer Microservices to Azure Container Apps"
echo "Resource Group: $RESOURCE_GROUP"
echo "Registry: $REGISTRY_NAME"
echo "Location: $LOCATION"
echo ""

# Check if logged into Azure
if ! az account show > /dev/null 2>&1; then
    echo "❌ Not logged into Azure. Please run 'az login' first."
    exit 1
fi

# Create resource group if it doesn't exist
echo "📁 Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION

# Get registry credentials
echo "🔑 Getting registry credentials..."
REGISTRY_USERNAME=$(az acr credential show --name $(echo $REGISTRY_NAME | cut -d'.' -f1) --query "username" -o tsv)
REGISTRY_PASSWORD=$(az acr credential show --name $(echo $REGISTRY_NAME | cut -d'.' -f1) --query "passwords[0].value" -o tsv)

# Prompt for required secrets
echo ""
echo "🔐 Please provide the following environment variables:"
read -p "MongoDB URI: " MONGODB_URI
read -s -p "Redis URL: " REDIS_URL
echo ""
read -s -p "JWT Secret: " JWT_SECRET
echo ""
read -s -p "Gemini API Key: " GEMINI_API_KEY
echo ""
read -s -p "Groq API Key: " GROQ_API_KEY
echo ""

# Deploy using ARM template
echo "🎯 Deploying Azure Container Apps..."
az deployment group create \
    --resource-group $RESOURCE_GROUP \
    --template-file azure-container-apps.json \
    --parameters \
        containerAppEnvName="quizzer-env" \
        location="$LOCATION" \
        dockerRegistry="$REGISTRY_NAME" \
        registryUsername="$REGISTRY_USERNAME" \
        registryPassword="$REGISTRY_PASSWORD" \
        mongodbUri="$MONGODB_URI" \
        redisUrl="$REDIS_URL" \
        jwtSecret="$JWT_SECRET" \
        geminiApiKey="$GEMINI_API_KEY" \
        groqApiKey="$GROQ_API_KEY" \
    --name $DEPLOYMENT_NAME

# Get deployment outputs
echo ""
echo "📊 Getting deployment information..."
AUTH_URL=$(az deployment group show --resource-group $RESOURCE_GROUP --name $DEPLOYMENT_NAME --query "properties.outputs.authServiceUrl.value" -o tsv)
QUIZ_URL=$(az deployment group show --resource-group $RESOURCE_GROUP --name $DEPLOYMENT_NAME --query "properties.outputs.quizServiceUrl.value" -o tsv)
AI_URL=$(az deployment group show --resource-group $RESOURCE_GROUP --name $DEPLOYMENT_NAME --query "properties.outputs.aiServiceUrl.value" -o tsv)
SUBMISSION_URL=$(az deployment group show --resource-group $RESOURCE_GROUP --name $DEPLOYMENT_NAME --query "properties.outputs.submissionServiceUrl.value" -o tsv)
ANALYTICS_URL=$(az deployment group show --resource-group $RESOURCE_GROUP --name $DEPLOYMENT_NAME --query "properties.outputs.analyticsServiceUrl.value" -o tsv)

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "Service URLs:"
echo "📍 Auth Service:       $AUTH_URL"
echo "📍 Quiz Service:       $QUIZ_URL"
echo "📍 AI Service:         $AI_URL"
echo "📍 Submission Service: $SUBMISSION_URL"
echo "📍 Analytics Service:  $ANALYTICS_URL"
echo ""
echo "💡 You can now test your services using Postman with these URLs!"
echo ""
echo "📝 To update environment variables later, use:"
echo "   az containerapp update --name <service-name> --resource-group $RESOURCE_GROUP --set-env-vars KEY=VALUE"
