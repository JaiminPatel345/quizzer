#!/bin/bash

# Azure Container Apps Deployment Script for Quizzer Platform
# This script builds and deploys all microservices to Azure Container Apps

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
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

# Load environment variables
if [ -f .env ]; then
    source .env
    print_status "Loaded environment variables from .env file"
else
    print_error ".env file not found. Please create it with required variables."
    exit 1
fi

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed. Please install it first."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install it first."
    exit 1
fi

# Function to check if user is logged in to Azure
check_azure_login() {
    print_status "Checking Azure login status..."
    if ! az account show &> /dev/null; then
        print_warning "Not logged in to Azure. Please log in."
        az login
    else
        print_success "Already logged in to Azure"
    fi
}

# Function to create resource group
create_resource_group() {
    print_status "Creating resource group: $AZURE_RESOURCE_GROUP"
    az group create \
        --name $AZURE_RESOURCE_GROUP \
        --location $AZURE_LOCATION \
        --output table
    print_success "Resource group created/updated"
}

# Function to create Azure Container Registry
create_container_registry() {
    print_status "Creating Azure Container Registry: $AZURE_CONTAINER_REGISTRY"
    az acr create \
        --resource-group $AZURE_RESOURCE_GROUP \
        --name $AZURE_CONTAINER_REGISTRY \
        --sku Basic \
        --admin-enabled true \
        --location $AZURE_LOCATION \
        --output table
    print_success "Container Registry created/updated"
}

# Function to create Container App Environment
create_container_app_environment() {
    print_status "Creating Container App Environment: $AZURE_CONTAINER_APP_ENV"
    az containerapp env create \
        --name $AZURE_CONTAINER_APP_ENV \
        --resource-group $AZURE_RESOURCE_GROUP \
        --location $AZURE_LOCATION \
        --output table
    print_success "Container App Environment created/updated"
}

# Function to create Azure Cosmos DB (MongoDB API)
create_cosmos_db() {
    print_status "Creating Azure Cosmos DB with MongoDB API"
    az cosmosdb create \
        --name "quizzer-cosmos-db" \
        --resource-group $AZURE_RESOURCE_GROUP \
        --kind MongoDB \
        --locations regionName=$AZURE_LOCATION \
        --default-consistency-level Session \
        --enable-automatic-failover true \
        --output table

    # Get connection string
    MONGODB_CONNECTION_STRING=$(az cosmosdb keys list \
        --name "quizzer-cosmos-db" \
        --resource-group $AZURE_RESOURCE_GROUP \
        --type connection-strings \
        --query "connectionStrings[0].connectionString" \
        --output tsv)

    print_success "Cosmos DB created. Connection string retrieved."
}

# Function to create Azure Cache for Redis
create_redis_cache() {
    print_status "Creating Azure Cache for Redis"
    az redis create \
        --name "quizzer-redis-cache" \
        --resource-group $AZURE_RESOURCE_GROUP \
        --location $AZURE_LOCATION \
        --sku Basic \
        --vm-size c0 \
        --output table

    # Get Redis connection details
    REDIS_HOSTNAME=$(az redis show \
        --name "quizzer-redis-cache" \
        --resource-group $AZURE_RESOURCE_GROUP \
        --query "hostName" \
        --output tsv)

    REDIS_ACCESS_KEY=$(az redis list-keys \
        --name "quizzer-redis-cache" \
        --resource-group $AZURE_RESOURCE_GROUP \
        --query "primaryKey" \
        --output tsv)

    print_success "Redis Cache created. Connection details retrieved."
}

# Function to build and push Docker images
build_and_push_images() {
    print_status "Building and pushing Docker images..."

    # Login to ACR
    az acr login --name $AZURE_CONTAINER_REGISTRY

    # Get ACR login server
    ACR_LOGIN_SERVER=$(az acr show --name $AZURE_CONTAINER_REGISTRY --resource-group $AZURE_RESOURCE_GROUP --query "loginServer" --output tsv)

    # Services to build
    services=("auth-service" "ai-service" "quiz-service" "analytics-service" "submission-service")

    for service in "${services[@]}"; do
        print_status "Building $service..."
        docker build -t $ACR_LOGIN_SERVER/$service:latest ./services/$service/

        print_status "Pushing $service to ACR..."
        docker push $ACR_LOGIN_SERVER/$service:latest

        print_success "$service built and pushed successfully"
    done
}

# Function to deploy container apps
deploy_container_apps() {
    print_status "Deploying container apps..."

    # Get ACR credentials
    ACR_LOGIN_SERVER=$(az acr show --name $AZURE_CONTAINER_REGISTRY --resource-group $AZURE_RESOURCE_GROUP --query "loginServer" --output tsv)
    ACR_USERNAME=$(az acr credential show --name $AZURE_CONTAINER_REGISTRY --query "username" --output tsv)
    ACR_PASSWORD=$(az acr credential show --name $AZURE_CONTAINER_REGISTRY --query "passwords[0].value" --output tsv)

    # Deploy auth service
    print_status "Deploying auth-service..."
    az containerapp create \
        --name "auth-service" \
        --resource-group $AZURE_RESOURCE_GROUP \
        --environment $AZURE_CONTAINER_APP_ENV \
        --image $ACR_LOGIN_SERVER/auth-service:latest \
        --target-port 3001 \
        --ingress external \
        --registry-server $ACR_LOGIN_SERVER \
        --registry-username $ACR_USERNAME \
        --registry-password $ACR_PASSWORD \
        --env-vars \
            NODE_ENV=production \
            MONGODB_URI="$MONGODB_CONNECTION_STRING" \
            REDIS_URL="rediss://:$REDIS_ACCESS_KEY@$REDIS_HOSTNAME:6380" \
            JWT_SECRET="$JWT_SECRET" \
            JWT_EXPIRES_IN="$JWT_EXPIRES_IN" \
            JWT_REFRESH_EXPIRES_IN="$JWT_REFRESH_EXPIRES_IN" \
            PORT=3001 \
        --cpu 0.5 \
        --memory 1Gi \
        --min-replicas 1 \
        --max-replicas 10

    # Get auth service URL
    AUTH_SERVICE_URL=$(az containerapp show --name "auth-service" --resource-group $AZURE_RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" --output tsv)
    AUTH_SERVICE_URL="https://$AUTH_SERVICE_URL"

    # Deploy AI service
    print_status "Deploying ai-service..."
    az containerapp create \
        --name "ai-service" \
        --resource-group $AZURE_RESOURCE_GROUP \
        --environment $AZURE_CONTAINER_APP_ENV \
        --image $ACR_LOGIN_SERVER/ai-service:latest \
        --target-port 3002 \
        --ingress external \
        --registry-server $ACR_LOGIN_SERVER \
        --registry-username $ACR_USERNAME \
        --registry-password $ACR_PASSWORD \
        --env-vars \
            NODE_ENV=production \
            MONGODB_URI="$MONGODB_CONNECTION_STRING" \
            REDIS_URL="rediss://:$REDIS_ACCESS_KEY@$REDIS_HOSTNAME:6380" \
            GEMINI_API_KEY="$GEMINI_API_KEY" \
            GROQ_API_KEY="$GROQ_API_KEY" \
            AUTH_SERVICE_URL="$AUTH_SERVICE_URL" \
            PORT=3002 \
        --cpu 0.5 \
        --memory 1Gi \
        --min-replicas 1 \
        --max-replicas 10

    # Get AI service URL
    AI_SERVICE_URL=$(az containerapp show --name "ai-service" --resource-group $AZURE_RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" --output tsv)
    AI_SERVICE_URL="https://$AI_SERVICE_URL"

    # Deploy quiz service
    print_status "Deploying quiz-service..."
    az containerapp create \
        --name "quiz-service" \
        --resource-group $AZURE_RESOURCE_GROUP \
        --environment $AZURE_CONTAINER_APP_ENV \
        --image $ACR_LOGIN_SERVER/quiz-service:latest \
        --target-port 3003 \
        --ingress external \
        --registry-server $ACR_LOGIN_SERVER \
        --registry-username $ACR_USERNAME \
        --registry-password $ACR_PASSWORD \
        --env-vars \
            NODE_ENV=production \
            MONGODB_URI="$MONGODB_CONNECTION_STRING" \
            REDIS_URL="rediss://:$REDIS_ACCESS_KEY@$REDIS_HOSTNAME:6380" \
            AUTH_SERVICE_URL="$AUTH_SERVICE_URL" \
            AI_SERVICE_URL="$AI_SERVICE_URL" \
            SMTP_HOST="$SMTP_HOST" \
            SMTP_PORT="$SMTP_PORT" \
            SMTP_USER="$SMTP_USER" \
            SMTP_PASS="$SMTP_PASS" \
            PORT=3003 \
        --cpu 0.5 \
        --memory 1Gi \
        --min-replicas 1 \
        --max-replicas 10

    # Get quiz service URL
    QUIZ_SERVICE_URL=$(az containerapp show --name "quiz-service" --resource-group $AZURE_RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" --output tsv)
    QUIZ_SERVICE_URL="https://$QUIZ_SERVICE_URL"

    # Deploy analytics service
    print_status "Deploying analytics-service..."
    az containerapp create \
        --name "analytics-service" \
        --resource-group $AZURE_RESOURCE_GROUP \
        --environment $AZURE_CONTAINER_APP_ENV \
        --image $ACR_LOGIN_SERVER/analytics-service:latest \
        --target-port 3004 \
        --ingress external \
        --registry-server $ACR_LOGIN_SERVER \
        --registry-username $ACR_USERNAME \
        --registry-password $ACR_PASSWORD \
        --env-vars \
            NODE_ENV=production \
            MONGODB_URI="$MONGODB_CONNECTION_STRING" \
            REDIS_URL="rediss://:$REDIS_ACCESS_KEY@$REDIS_HOSTNAME:6380" \
            AUTH_SERVICE_URL="$AUTH_SERVICE_URL" \
            QUIZ_SERVICE_URL="$QUIZ_SERVICE_URL" \
            PORT=3004 \
        --cpu 0.5 \
        --memory 1Gi \
        --min-replicas 1 \
        --max-replicas 10

    # Get analytics service URL
    ANALYTICS_SERVICE_URL=$(az containerapp show --name "analytics-service" --resource-group $AZURE_RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" --output tsv)
    ANALYTICS_SERVICE_URL="https://$ANALYTICS_SERVICE_URL"

    # Deploy submission service
    print_status "Deploying submission-service..."
    az containerapp create \
        --name "submission-service" \
        --resource-group $AZURE_RESOURCE_GROUP \
        --environment $AZURE_CONTAINER_APP_ENV \
        --image $ACR_LOGIN_SERVER/submission-service:latest \
        --target-port 3005 \
        --ingress external \
        --registry-server $ACR_LOGIN_SERVER \
        --registry-username $ACR_USERNAME \
        --registry-password $ACR_PASSWORD \
        --env-vars \
            NODE_ENV=production \
            MONGODB_URI="$MONGODB_CONNECTION_STRING" \
            REDIS_URL="rediss://:$REDIS_ACCESS_KEY@$REDIS_HOSTNAME:6380" \
            AUTH_SERVICE_URL="$AUTH_SERVICE_URL" \
            QUIZ_SERVICE_URL="$QUIZ_SERVICE_URL" \
            AI_SERVICE_URL="$AI_SERVICE_URL" \
            ANALYTICS_SERVICE_URL="$ANALYTICS_SERVICE_URL" \
            PORT=3005 \
        --cpu 0.5 \
        --memory 1Gi \
        --min-replicas 1 \
        --max-replicas 10

    # Get submission service URL
    SUBMISSION_SERVICE_URL=$(az containerapp show --name "submission-service" --resource-group $AZURE_RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" --output tsv)
    SUBMISSION_SERVICE_URL="https://$SUBMISSION_SERVICE_URL"

    print_success "All services deployed successfully!"

    # Print service URLs
    echo ""
    print_success "Service URLs:"
    echo "Auth Service: $AUTH_SERVICE_URL"
    echo "AI Service: $AI_SERVICE_URL"
    echo "Quiz Service: $QUIZ_SERVICE_URL"
    echo "Analytics Service: $ANALYTICS_SERVICE_URL"
    echo "Submission Service: $SUBMISSION_SERVICE_URL"
}

# Function to show deployment status
show_status() {
    print_status "Checking deployment status..."
    az containerapp list --resource-group $AZURE_RESOURCE_GROUP --output table
}

# Main deployment function
main() {
    print_status "Starting Azure deployment for Quizzer Platform..."

    # Check prerequisites
    check_azure_login

    # Create Azure resources
    create_resource_group
    create_container_registry
    create_container_app_environment
    create_cosmos_db
    create_redis_cache

    # Build and deploy
    build_and_push_images
    deploy_container_apps

    # Show final status
    show_status

    print_success "Deployment completed successfully!"
    print_warning "Please update your .env file with the new service URLs for local development if needed."
}

# Script options
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "build")
        check_azure_login
        build_and_push_images
        ;;
    "status")
        show_status
        ;;
    "clean")
        print_warning "This will delete all resources in resource group: $AZURE_RESOURCE_GROUP"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Deleting resource group..."
            az group delete --name $AZURE_RESOURCE_GROUP --yes --no-wait
            print_success "Resource group deletion initiated"
        fi
        ;;
    *)
        echo "Usage: $0 {deploy|build|status|clean}"
        echo "  deploy - Full deployment (default)"
        echo "  build  - Build and push images only"
        echo "  status - Show deployment status"
        echo "  clean  - Delete all resources"
        exit 1
        ;;
esac
