#!/bin/bash

# Azure Container Instances Deployment Script for Quizzer Platform
# This script builds and deploys all microservices to Azure Container Instances (ACI)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Generate unique registry name with timestamp
TIMESTAMP=$(date +%s)
AZURE_CONTAINER_REGISTRY="${AZURE_CONTAINER_REGISTRY}${TIMESTAMP}"

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
    print_status "Creating Azure Container Registry..."

    # Check if registry name is available and generate unique one
    local base_name="quizzerregistry"
    local unique_name="${base_name}${TIMESTAMP}"

    # Check if we can use existing registry
    if az acr show --name "$AZURE_CONTAINER_REGISTRY" --resource-group "$AZURE_RESOURCE_GROUP" &> /dev/null; then
        print_success "Using existing container registry: $AZURE_CONTAINER_REGISTRY"
        return
    fi

    AZURE_CONTAINER_REGISTRY="$unique_name"

    az acr create \
        --resource-group $AZURE_RESOURCE_GROUP \
        --name $AZURE_CONTAINER_REGISTRY \
        --sku Basic \
        --admin-enabled true \
        --location $AZURE_LOCATION \
        --output table
    print_success "Container Registry created: $AZURE_CONTAINER_REGISTRY"
}

# Function to build and push Docker images
build_and_push_images() {
    print_status "Building and pushing Docker images..."

    # Login to ACR
    az acr login --name $AZURE_CONTAINER_REGISTRY

    # Get ACR login server
    ACR_LOGIN_SERVER=$(az acr show --name $AZURE_CONTAINER_REGISTRY --resource-group $AZURE_RESOURCE_GROUP --query "loginServer" --output tsv)

    # Services to build with root context (using our updated Dockerfiles)
    services=("auth-service" "ai-service" "quiz-service" "analytics-service" "submission-service")

    for service in "${services[@]}"; do
        print_status "Building $service..."
        # Use root context and specify dockerfile path
        docker build -f services/$service/Dockerfile -t $ACR_LOGIN_SERVER/$service:latest .

        print_status "Pushing $service to ACR..."
        docker push $ACR_LOGIN_SERVER/$service:latest

        print_success "$service built and pushed successfully"
    done
}

# Function to deploy container instances
deploy_container_instances() {
    print_status "Deploying container instances..."

    # Get ACR credentials
    ACR_LOGIN_SERVER=$(az acr show --name $AZURE_CONTAINER_REGISTRY --resource-group $AZURE_RESOURCE_GROUP --query "loginServer" --output tsv)
    ACR_USERNAME=$(az acr credential show --name $AZURE_CONTAINER_REGISTRY --query "username" --output tsv)
    ACR_PASSWORD=$(az acr credential show --name $AZURE_CONTAINER_REGISTRY --query "passwords[0].value" --output tsv)

    # Deploy auth service
    print_status "Deploying auth-service..."
    az container create \
        --resource-group $AZURE_RESOURCE_GROUP \
        --name "auth-service" \
        --image $ACR_LOGIN_SERVER/auth-service:latest \
        --os-type Linux \
        --cpu 1 \
        --memory 1.5 \
        --registry-login-server $ACR_LOGIN_SERVER \
        --registry-username $ACR_USERNAME \
        --registry-password $ACR_PASSWORD \
        --ports 3001 \
        --ip-address Public \
        --dns-name-label "quizzer-auth-${TIMESTAMP}" \
        --environment-variables \
            NODE_ENV="$NODE_ENV" \
            MONGODB_URI="$MONGODB_URI" \
            REDIS_URL="$REDIS_URL" \
            JWT_SECRET="$JWT_SECRET" \
            PORT=3001

    # Get auth service URL
    AUTH_FQDN=$(az container show --resource-group $AZURE_RESOURCE_GROUP --name "auth-service" --query "ipAddress.fqdn" --output tsv)
    AUTH_SERVICE_URL="http://$AUTH_FQDN:3001"

    print_status "Deploying ai-service..."
    az container create \
        --resource-group $AZURE_RESOURCE_GROUP \
        --name "ai-service" \
        --image $ACR_LOGIN_SERVER/ai-service:latest \
        --os-type Linux \
        --cpu 1 \
        --memory 1.5 \
        --registry-login-server $ACR_LOGIN_SERVER \
        --registry-username $ACR_USERNAME \
        --registry-password $ACR_PASSWORD \
        --ports 3002 \
        --ip-address Public \
        --dns-name-label "quizzer-ai-${TIMESTAMP}" \
        --environment-variables \
            NODE_ENV="$NODE_ENV" \
            MONGODB_URI="$MONGODB_URI" \
            REDIS_URL="$REDIS_URL" \
            GEMINI_API_KEY="$GEMINI_API_KEY" \
            GROQ_API_KEY="$GROQ_API_KEY" \
            AUTH_SERVICE_URL="$AUTH_SERVICE_URL" \
            PORT=3002

    # Get AI service URL
    AI_FQDN=$(az container show --resource-group $AZURE_RESOURCE_GROUP --name "ai-service" --query "ipAddress.fqdn" --output tsv)
    AI_SERVICE_URL="http://$AI_FQDN:3002"

    print_status "Deploying quiz-service..."
    az container create \
        --resource-group $AZURE_RESOURCE_GROUP \
        --name "quiz-service" \
        --image $ACR_LOGIN_SERVER/quiz-service:latest \
        --os-type Linux \
        --cpu 1 \
        --memory 1.5 \
        --registry-login-server $ACR_LOGIN_SERVER \
        --registry-username $ACR_USERNAME \
        --registry-password $ACR_PASSWORD \
        --ports 3003 \
        --ip-address Public \
        --dns-name-label "quizzer-quiz-${TIMESTAMP}" \
        --environment-variables \
            NODE_ENV="$NODE_ENV" \
            MONGODB_URI="$MONGODB_URI" \
            REDIS_URL="$REDIS_URL" \
            AUTH_SERVICE_URL="$AUTH_SERVICE_URL" \
            AI_SERVICE_URL="$AI_SERVICE_URL" \
            EMAIL_USER="$EMAIL_USER" \
            EMAIL_PASSWORD="$EMAIL_PASSWORD" \
            PORT=3003

    # Get quiz service URL
    QUIZ_FQDN=$(az container show --resource-group $AZURE_RESOURCE_GROUP --name "quiz-service" --query "ipAddress.fqdn" --output tsv)
    QUIZ_SERVICE_URL="http://$QUIZ_FQDN:3003"

    print_status "Deploying analytics-service..."
    az container create \
        --resource-group $AZURE_RESOURCE_GROUP \
        --name "analytics-service" \
        --image $ACR_LOGIN_SERVER/analytics-service:latest \
        --os-type Linux \
        --cpu 1 \
        --memory 1.5 \
        --registry-login-server $ACR_LOGIN_SERVER \
        --registry-username $ACR_USERNAME \
        --registry-password $ACR_PASSWORD \
        --ports 3005 \
        --ip-address Public \
        --dns-name-label "quizzer-analytics-${TIMESTAMP}" \
        --environment-variables \
            NODE_ENV="$NODE_ENV" \
            MONGODB_URI="$MONGODB_URI" \
            REDIS_URL="$REDIS_URL" \
            AUTH_SERVICE_URL="$AUTH_SERVICE_URL" \
            QUIZ_SERVICE_URL="$QUIZ_SERVICE_URL" \
            PORT=3005

    # Get analytics service URL
    ANALYTICS_FQDN=$(az container show --resource-group $AZURE_RESOURCE_GROUP --name "analytics-service" --query "ipAddress.fqdn" --output tsv)
    ANALYTICS_SERVICE_URL="http://$ANALYTICS_FQDN:3005"

    print_status "Deploying submission-service..."
    az container create \
        --resource-group $AZURE_RESOURCE_GROUP \
        --name "submission-service" \
        --image $ACR_LOGIN_SERVER/submission-service:latest \
        --os-type Linux \
        --cpu 1 \
        --memory 1.5 \
        --registry-login-server $ACR_LOGIN_SERVER \
        --registry-username $ACR_USERNAME \
        --registry-password $ACR_PASSWORD \
        --ports 3004 \
        --ip-address Public \
        --dns-name-label "quizzer-submission-${TIMESTAMP}" \
        --environment-variables \
            NODE_ENV="$NODE_ENV" \
            MONGODB_URI="$MONGODB_URI" \
            REDIS_URL="$REDIS_URL" \
            AUTH_SERVICE_URL="$AUTH_SERVICE_URL" \
            QUIZ_SERVICE_URL="$QUIZ_SERVICE_URL" \
            AI_SERVICE_URL="$AI_SERVICE_URL" \
            ANALYTICS_SERVICE_URL="$ANALYTICS_SERVICE_URL" \
            PORT=3004

    # Get submission service URL
    SUBMISSION_FQDN=$(az container show --resource-group $AZURE_RESOURCE_GROUP --name "submission-service" --query "ipAddress.fqdn" --output tsv)
    SUBMISSION_SERVICE_URL="http://$SUBMISSION_FQDN:3004"

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
    az container list --resource-group $AZURE_RESOURCE_GROUP --output table
}

# Main deployment function
main() {
    print_status "Starting Azure Container Instances deployment for Quizzer Platform..."

    # Check prerequisites
    check_azure_login

    # Create Azure resources
    create_resource_group
    create_container_registry

    # Build and deploy
    build_and_push_images
    deploy_container_instances

    # Show final status
    show_status

    print_success "Deployment completed successfully!"
}

# Script options
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "build")
        check_azure_login
        create_resource_group
        create_container_registry
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
