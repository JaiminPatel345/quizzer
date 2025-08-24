#!/bin/bash

# Azure Container Apps Deployment Script for Quizzer Microservices
# This script deploys your microservices to Azure Container Apps (Free tier)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Azure Container Apps Deployment for Quizzer${NC}"

# Load environment variables
if [ -f .env.production ]; then
    source .env.production
    echo -e "${GREEN}✅ Loaded environment variables${NC}"
else
    echo -e "${RED}❌ .env.production file not found. Please create it first.${NC}"
    exit 1
fi

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI is not installed. Please install it first.${NC}"
    echo "Install Azure CLI: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Login to Azure (if not already logged in)
echo -e "${YELLOW}🔐 Checking Azure login status...${NC}"
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}Please login to Azure...${NC}"
    az login
fi

# Set subscription (if specified)
if [ ! -z "$AZURE_SUBSCRIPTION_ID" ]; then
    az account set --subscription $AZURE_SUBSCRIPTION_ID
    echo -e "${GREEN}✅ Set subscription to $AZURE_SUBSCRIPTION_ID${NC}"
fi

# Create resource group
echo -e "${YELLOW}📦 Creating resource group...${NC}"
az group create \
    --name $AZURE_RESOURCE_GROUP \
    --location $AZURE_LOCATION \
    --output table

# Create Azure Container Registry
echo -e "${YELLOW}🐳 Creating Azure Container Registry...${NC}"
az acr create \
    --resource-group $AZURE_RESOURCE_GROUP \
    --name $AZURE_CONTAINER_REGISTRY \
    --sku Basic \
    --admin-enabled true \
    --output table

# Login to ACR
echo -e "${YELLOW}🔑 Logging into Azure Container Registry...${NC}"
az acr login --name $AZURE_CONTAINER_REGISTRY

# Get ACR login server
ACR_LOGIN_SERVER=$(az acr show --name $AZURE_CONTAINER_REGISTRY --resource-group $AZURE_RESOURCE_GROUP --query loginServer --output tsv)
echo -e "${GREEN}✅ ACR Login Server: $ACR_LOGIN_SERVER${NC}"

# Build and push Docker images
echo -e "${YELLOW}🔨 Building and pushing Docker images...${NC}"

services=("ai-service" "quiz-service" "auth-service" "analytics-service" "submission-service")

for service in "${services[@]}"; do
    echo -e "${BLUE}Building $service...${NC}"
    
    # Build Docker image
    docker build -t $ACR_LOGIN_SERVER/quizzer-$service:latest ./services/$service/
    
    # Push to ACR
    docker push $ACR_LOGIN_SERVER/quizzer-$service:latest
    
    echo -e "${GREEN}✅ $service pushed to ACR${NC}"
done

# Create Container Apps Environment
echo -e "${YELLOW}🌐 Creating Container Apps Environment...${NC}"
az containerapp env create \
    --name $AZURE_CONTAINER_APP_ENV \
    --resource-group $AZURE_RESOURCE_GROUP \
    --location $AZURE_LOCATION \
    --output table

# Deploy Container Apps
echo -e "${YELLOW}🚀 Deploying Container Apps...${NC}"

# Deploy each service
for service in "${services[@]}"; do
    echo -e "${BLUE}Deploying $service...${NC}"
    
    # Determine port based on service
    case $service in
        "ai-service") PORT=3001 ;;
        "quiz-service") PORT=3002 ;;
        "auth-service") PORT=3003 ;;
        "analytics-service") PORT=3004 ;;
        "submission-service") PORT=3005 ;;
    esac
    
    az containerapp create \
        --name quizzer-$service \
        --resource-group $AZURE_RESOURCE_GROUP \
        --environment $AZURE_CONTAINER_APP_ENV \
        --image $ACR_LOGIN_SERVER/quizzer-$service:latest \
        --target-port $PORT \
        --ingress external \
        --min-replicas 0 \
        --max-replicas 1 \
        --cpu 0.25 \
        --memory 0.5Gi \
        --registry-server $ACR_LOGIN_SERVER \
        --env-vars \
            NODE_ENV=production \
            PORT=$PORT \
            MONGO_URI="$MONGO_URI" \
            REDIS_URL="$REDIS_URL" \
            JWT_SECRET="$JWT_SECRET" \
            GEMINI_API_KEY="$GEMINI_API_KEY" \
            GROQ_API_KEY="$GROQ_API_KEY" \
            EMAIL_USER="$EMAIL_USER" \
            EMAIL_PASSWORD="$EMAIL_PASSWORD" \
        --output table
    
    echo -e "${GREEN}✅ $service deployed successfully${NC}"
done

# Get application URLs
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}Your application URLs:${NC}"

for service in "${services[@]}"; do
    URL=$(az containerapp show --name quizzer-$service --resource-group $AZURE_RESOURCE_GROUP --query properties.configuration.ingress.fqdn --output tsv)
    echo -e "${GREEN}$service: https://$URL${NC}"
done

echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Update your frontend to use the new service URLs"
echo "2. Configure custom domains if needed"
echo "3. Set up monitoring and logging"
echo "4. Configure CI/CD pipeline for automated deployments"

echo -e "${GREEN}🎊 Your Quizzer microservices are now running on Azure!${NC}"
