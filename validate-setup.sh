#!/bin/bash

# GitHub Actions CI/CD Setup Validation Script
# This script helps validate your Azure and GitHub setup

echo "🔍 GitHub Actions CI/CD Setup Validation"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Check prerequisites
echo -e "\n${YELLOW}Checking Prerequisites...${NC}"

command_exists az
print_status $? "Azure CLI installed"

command_exists git
print_status $? "Git installed"

command_exists docker
print_status $? "Docker installed"

# Check Azure login
echo -e "\n${YELLOW}Checking Azure Authentication...${NC}"

az account show > /dev/null 2>&1
if [ $? -eq 0 ]; then
    SUBSCRIPTION_ID=$(az account show --query id --output tsv)
    SUBSCRIPTION_NAME=$(az account show --query name --output tsv)
    echo -e "${GREEN}✅ Logged into Azure${NC}"
    echo "   Subscription: $SUBSCRIPTION_NAME"
    echo "   ID: $SUBSCRIPTION_ID"
else
    echo -e "${RED}❌ Not logged into Azure${NC}"
    echo "   Run: az login"
fi

# Check for GitHub repository
echo -e "\n${YELLOW}Checking Git Repository...${NC}"

if [ -d ".git" ]; then
    REMOTE_URL=$(git remote get-url origin 2>/dev/null)
    if [[ $REMOTE_URL == *"github.com"* ]]; then
        echo -e "${GREEN}✅ GitHub repository detected${NC}"
        echo "   Remote: $REMOTE_URL"
    else
        echo -e "${YELLOW}⚠️  Git repository found but not GitHub${NC}"
    fi
else
    echo -e "${RED}❌ Not a Git repository${NC}"
    echo "   Initialize with: git init"
fi

# Check for required files
echo -e "\n${YELLOW}Checking Required Files...${NC}"

if [ -f ".github/workflows/deploy-microservices.yml" ]; then
    echo -e "${GREEN}✅ Main deployment workflow found${NC}"
else
    echo -e "${RED}❌ Main deployment workflow missing${NC}"
fi

if [ -f ".github/workflows/deploy-staging.yml" ]; then
    echo -e "${GREEN}✅ Staging deployment workflow found${NC}"
else
    echo -e "${RED}❌ Staging deployment workflow missing${NC}"
fi

if [ -f "AZURE_SETUP_GUIDE.md" ]; then
    echo -e "${GREEN}✅ Azure setup guide found${NC}"
else
    echo -e "${RED}❌ Azure setup guide missing${NC}"
fi

# Check service directories and Dockerfiles
echo -e "\n${YELLOW}Checking Service Structure...${NC}"

SERVICES=("auth-service" "quiz-service" "ai-service" "analytics-service" "submission-service")

for service in "${SERVICES[@]}"; do
    if [ -d "services/$service" ]; then
        echo -e "${GREEN}✅ $service directory found${NC}"
        
        if [ -f "services/$service/Dockerfile" ]; then
            echo -e "${GREEN}  ✅ Dockerfile found${NC}"
        else
            echo -e "${RED}  ❌ Dockerfile missing${NC}"
        fi
        
        if [ -f "services/$service/package.json" ]; then
            echo -e "${GREEN}  ✅ package.json found${NC}"
        else
            echo -e "${RED}  ❌ package.json missing${NC}"
        fi
    else
        echo -e "${RED}❌ $service directory missing${NC}"
    fi
done

# Check for Azure resources (if logged in)
if az account show > /dev/null 2>&1; then
    echo -e "\n${YELLOW}Checking Azure Resources...${NC}"
    
    # Check for resource groups
    RG_COUNT=$(az group list --query "length([?starts_with(name, 'quizzer')])" --output tsv)
    if [ "$RG_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ Found $RG_COUNT resource group(s) with 'quizzer' prefix${NC}"
        az group list --query "[?starts_with(name, 'quizzer')].{Name:name, Location:location}" --output table
    else
        echo -e "${RED}❌ No resource groups found with 'quizzer' prefix${NC}"
    fi
    
    # Check for container registries
    ACR_COUNT=$(az acr list --query "length([?contains(name, 'quizzer')])" --output tsv)
    if [ "$ACR_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ Found $ACR_COUNT container registry(s) with 'quizzer' in name${NC}"
        az acr list --query "[?contains(name, 'quizzer')].{Name:name, LoginServer:loginServer}" --output table
    else
        echo -e "${RED}❌ No container registries found with 'quizzer' in name${NC}"
    fi
fi

echo -e "\n${YELLOW}Required GitHub Secrets:${NC}"
echo "================================"
echo "Azure Credentials:"
echo "- AZURE_CREDENTIALS"
echo "- AZURE_SUBSCRIPTION_ID"
echo ""
echo "Container Registry:"
echo "- AZURE_CONTAINER_REGISTRY"
echo "- AZURE_CONTAINER_REGISTRY_NAME"
echo "- AZURE_CONTAINER_REGISTRY_USERNAME"
echo "- AZURE_CONTAINER_REGISTRY_PASSWORD"
echo ""
echo "Resource Groups & Environments:"
echo "- AZURE_RESOURCE_GROUP"
echo "- AZURE_RESOURCE_GROUP_STAGING"
echo "- AZURE_CONTAINER_APP_ENVIRONMENT"
echo "- AZURE_CONTAINER_APP_ENVIRONMENT_STAGING"
echo ""
echo "Application Secrets:"
echo "- MONGODB_URI"
echo "- MONGODB_URI_STAGING"
echo "- REDIS_URL"
echo "- REDIS_URL_STAGING"
echo "- JWT_SECRET"
echo "- GEMINI_API_KEY"
echo "- GROQ_API_KEY"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Follow the AZURE_SETUP_GUIDE.md for detailed setup instructions"
echo "2. Set up all required GitHub secrets in your repository"
echo "3. Push your code to trigger the first deployment"
echo "4. Monitor the GitHub Actions workflow in the Actions tab"

echo -e "\n${GREEN}Setup validation complete!${NC}"
