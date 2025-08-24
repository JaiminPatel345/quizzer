#!/bin/bash

# Azure Container Apps Deployment Script for Quizzer Microservices (FREE TIER)
# This script deploys your microservices to Azure Container Apps using external databases

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Azure Container Apps Deployment for Quizzer (FREE TIER)${NC}"

# Load environment variables
if [ -f .env.production ]; then
    source .env.production
    echo -e "${GREEN}✅ Loaded environment variables${NC}"
else
    echo -e "${RED}❌ .env.production file not found. Please create it first.${NC}"
    exit 1
fi

# Validate required environment variables
required_vars=("MONGO_URI" "REDIS_URL" "JWT_SECRET" "AZURE_RESOURCE_GROUP" "AZURE_LOCATION" "AZURE_CONTAINER_REGISTRY" "AZURE_CONTAINER_APP_ENV")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Required environment variable $var is not set${NC}"
        exit 1
    fi
done

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI is not installed. Please install it first.${NC}"
    echo "Install Azure CLI: curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash"
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

# Register required resource providers
echo -e "${YELLOW}📋 Registering required Azure resource providers...${NC}"

providers=("Microsoft.ContainerRegistry" "Microsoft.App" "Microsoft.OperationalInsights")
for provider in "${providers[@]}"; do
    status=$(az provider show -n $provider --query "registrationState" -o tsv 2>/dev/null || echo "NotRegistered")
    if [ "$status" != "Registered" ]; then
        echo -e "${BLUE}Registering $provider...${NC}"
        az provider register --namespace $provider
        
        # Wait for registration to complete
        echo -e "${YELLOW}Waiting for $provider to register...${NC}"
        while [ "$(az provider show -n $provider --query 'registrationState' -o tsv)" != "Registered" ]; do
            echo "Still registering $provider..."
            sleep 10
        done
        echo -e "${GREEN}✅ $provider registered successfully${NC}"
    else
        echo -e "${GREEN}✅ $provider already registered${NC}"
    fi
done

# Create resource group
echo -e "${YELLOW}📦 Checking resource group...${NC}"
if ! az group show --name $AZURE_RESOURCE_GROUP &> /dev/null; then
    echo -e "${YELLOW}Creating resource group $AZURE_RESOURCE_GROUP...${NC}"
    az group create \
        --name $AZURE_RESOURCE_GROUP \
        --location $AZURE_LOCATION \
        --output table
    echo -e "${GREEN}✅ Resource group created${NC}"
else
    echo -e "${GREEN}✅ Resource group $AZURE_RESOURCE_GROUP already exists${NC}"
fi

# Create Azure Container Registry (FREE TIER) - Check if exists first
echo -e "${YELLOW}🐳 Checking Azure Container Registry...${NC}"
if ! az acr show --name $AZURE_CONTAINER_REGISTRY --resource-group $AZURE_RESOURCE_GROUP &> /dev/null; then
    echo -e "${YELLOW}Creating Azure Container Registry $AZURE_CONTAINER_REGISTRY (Basic SKU)...${NC}"
    az acr create \
        --resource-group $AZURE_RESOURCE_GROUP \
        --name $AZURE_CONTAINER_REGISTRY \
        --sku Basic \
        --admin-enabled true \
        --output table
    echo -e "${GREEN}✅ Azure Container Registry created${NC}"
else
    echo -e "${GREEN}✅ Azure Container Registry $AZURE_CONTAINER_REGISTRY already exists${NC}"
fi

# Login to ACR
echo -e "${YELLOW}🔑 Logging into Azure Container Registry...${NC}"
az acr login --name $AZURE_CONTAINER_REGISTRY

# Get ACR login server
ACR_LOGIN_SERVER=$(az acr show --name $AZURE_CONTAINER_REGISTRY --resource-group $AZURE_RESOURCE_GROUP --query loginServer --output tsv)
echo -e "${GREEN}✅ ACR Login Server: $ACR_LOGIN_SERVER${NC}"

# Get ACR credentials for Container Apps
ACR_USERNAME=$(az acr credential show --name $AZURE_CONTAINER_REGISTRY --query username --output tsv)
ACR_PASSWORD=$(az acr credential show --name $AZURE_CONTAINER_REGISTRY --query passwords[0].value --output tsv)

# Build and push Docker images
echo -e "${YELLOW}🔨 Building and pushing Docker images...${NC}"

services=("ai-service" "quiz-service" "auth-service" "analytics-service" "submission-service")

for service in "${services[@]}"; do
    echo -e "${BLUE}Building $service...${NC}"
    
    # Check if yarn.lock exists, if not create one
    if [ ! -f "./services/$service/yarn.lock" ]; then
        echo -e "${YELLOW}Creating yarn.lock for $service...${NC}"
        cd "./services/$service"
        yarn install
        cd "../../"
    fi
    
    # Copy .env.production as .env for Docker build to each service directory
    cp .env.production ./services/$service/.env
    
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
    
    # Basic environment variables only (sensitive vars will be set via Azure Portal)
    env_vars="NODE_ENV=production PORT=${PORT}"
    
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
        --registry-username $ACR_USERNAME \
        --registry-password $ACR_PASSWORD \
        --env-vars $env_vars \
        --output table
    
    echo -e "${GREEN}✅ $service deployed successfully${NC}"
done

# Get application URLs and update inter-service communication
echo -e "${YELLOW}🔗 Getting service URLs and updating inter-service communication...${NC}"

declare -A service_urls
for service in "${services[@]}"; do
    URL=$(az containerapp show --name quizzer-$service --resource-group $AZURE_RESOURCE_GROUP --query properties.configuration.ingress.fqdn --output tsv)
    service_urls[$service]="https://$URL"
done

# Update services with correct URLs
echo -e "${YELLOW}🔄 Updating service environment variables...${NC}"

# Update quiz-service with AI service URL
if [ ! -z "${service_urls[ai-service]}" ]; then
    az containerapp update \
        --name quizzer-quiz-service \
        --resource-group $AZURE_RESOURCE_GROUP \
        --set-env-vars AI_SERVICE_URL="${service_urls[ai-service]}" \
        --output none
fi

# Update submission-service with both AI and Quiz service URLs
if [ ! -z "${service_urls[ai-service]}" ] && [ ! -z "${service_urls[quiz-service]}" ]; then
    az containerapp update \
        --name quizzer-submission-service \
        --resource-group $AZURE_RESOURCE_GROUP \
        --set-env-vars AI_SERVICE_URL="${service_urls[ai-service]}" QUIZ_SERVICE_URL="${service_urls[quiz-service]}" \
        --output none
fi

# Display results
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}Your application URLs:${NC}"

for service in "${services[@]}"; do
    echo -e "${GREEN}$service: ${service_urls[$service]}${NC}"
done

echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Test your services using the URLs above"
echo "2. Update your frontend to use the new service URLs"
echo "3. Configure custom domains if needed"
echo "4. Set up monitoring and logging"

echo -e "${BLUE}💰 Cost Information:${NC}"
echo "• Container Apps: FREE tier includes 2M requests/month and 400K GB-seconds"
echo "• Container Registry: Basic tier ~\$5/month"
echo "• MongoDB: Using your free MongoDB Atlas cluster"
echo "• Redis: Using your free Redis provider"
echo "• Total estimated cost: ~\$5/month"

echo -e "${GREEN}🎊 Your Quizzer microservices are now running on Azure for FREE!${NC}"
