#!/bin/bash

# Script to create all Azure resources and get credentials for GitHub Actions
# Run this in Azure Cloud Shell or with Azure CLI installed

echo "� Setting up Azure Resources for Quizzer Microservices"
echo "======================================================="

# Your existing values from .env
SUBSCRIPTION_ID="0e4df7a2-5049-47d1-8247-bb121f0b9d31"
RESOURCE_GROUP="quizzer"
RESOURCE_GROUP_STAGING="quizzer-staging"
REGISTRY_NAME="quizzerregistry1724520000"
CONTAINER_APP_ENV="quizzer-env"
CONTAINER_APP_ENV_STAGING="quizzer-env-staging"
LOCATION="southindia"

echo "Subscription ID: $SUBSCRIPTION_ID"
echo "Resource Group (Prod): $RESOURCE_GROUP"
echo "Resource Group (Staging): $RESOURCE_GROUP_STAGING"
echo "Registry Name: $REGISTRY_NAME"
echo "Container App Environment (Prod): $CONTAINER_APP_ENV"
echo "Container App Environment (Staging): $CONTAINER_APP_ENV_STAGING"
echo "Location: $LOCATION"
echo ""

# Check if logged in
echo "Checking Azure login status..."
if ! az account show > /dev/null 2>&1; then
    echo "❌ Not logged into Azure. Please run 'az login' first."
    exit 1
fi

echo "✅ Logged into Azure"
echo ""

# Step 1: Create or verify resource groups
echo "📁 Step 1: Creating/verifying resource groups..."
az group create --name $RESOURCE_GROUP --location $LOCATION
echo "✅ Production resource group ready: $RESOURCE_GROUP"

az group create --name $RESOURCE_GROUP_STAGING --location $LOCATION
echo "✅ Staging resource group ready: $RESOURCE_GROUP_STAGING"
echo ""

# Step 2: Check if Container Registry exists, if not create it
echo "🐳 Step 2: Setting up Container Registry..."
if az acr show --name $REGISTRY_NAME > /dev/null 2>&1; then
    echo "✅ Container Registry already exists: $REGISTRY_NAME"
else
    echo "Creating Container Registry: $REGISTRY_NAME"
    az acr create --resource-group $RESOURCE_GROUP --name $REGISTRY_NAME --sku Basic --location $LOCATION
    echo "✅ Container Registry created: $REGISTRY_NAME"
fi

# Enable admin user
az acr update --name $REGISTRY_NAME --admin-enabled true
echo "✅ Container Registry admin user enabled"
echo ""

# Step 3: Create Container Apps Environments
echo "📦 Step 3: Creating Container Apps Environments..."

# Check if production environment exists
if az containerapp env show --name $CONTAINER_APP_ENV --resource-group $RESOURCE_GROUP > /dev/null 2>&1; then
    echo "✅ Production Container App Environment already exists: $CONTAINER_APP_ENV"
else
    echo "Creating Production Container App Environment: $CONTAINER_APP_ENV"
    az containerapp env create \
        --name $CONTAINER_APP_ENV \
        --resource-group $RESOURCE_GROUP \
        --location $LOCATION
    echo "✅ Production Container App Environment created: $CONTAINER_APP_ENV"
fi

# Check if staging environment exists
if az containerapp env show --name $CONTAINER_APP_ENV_STAGING --resource-group $RESOURCE_GROUP_STAGING > /dev/null 2>&1; then
    echo "✅ Staging Container App Environment already exists: $CONTAINER_APP_ENV_STAGING"
else
    echo "Creating Staging Container App Environment: $CONTAINER_APP_ENV_STAGING"
    az containerapp env create \
        --name $CONTAINER_APP_ENV_STAGING \
        --resource-group $RESOURCE_GROUP_STAGING \
        --location $LOCATION
    echo "✅ Staging Container App Environment created: $CONTAINER_APP_ENV_STAGING"
fi
echo ""

# Step 4: Create service principal with Contributor role
echo "🔑 Step 4: Creating service principal for GitHub Actions..."
echo "This will output JSON that you need to copy for AZURE_CREDENTIALS secret"
echo ""

SERVICE_PRINCIPAL_JSON=$(az ad sp create-for-rbac \
  --name "github-actions-quizzer-$(date +%s)" \
  --role "Contributor" \
  --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP_STAGING" \
  --sdk-auth)

echo "AZURE_CREDENTIALS (copy this entire JSON):"
echo "=========================================="
echo "$SERVICE_PRINCIPAL_JSON"
echo ""

# Step 5: Get all the credentials and values
echo "📋 Step 5: All GitHub Secrets Values"
echo "===================================="
echo ""

echo "🔐 Azure Credentials:"
echo "AZURE_CREDENTIALS (JSON above)"
echo "AZURE_SUBSCRIPTION_ID: $SUBSCRIPTION_ID"
echo ""

echo "🐳 Container Registry:"
REGISTRY_LOGIN_SERVER=$(az acr show --name $REGISTRY_NAME --query loginServer --output tsv)
REGISTRY_USERNAME=$(az acr credential show --name $REGISTRY_NAME --query username --output tsv)
REGISTRY_PASSWORD=$(az acr credential show --name $REGISTRY_NAME --query "passwords[0].value" --output tsv)

echo "AZURE_CONTAINER_REGISTRY: $REGISTRY_LOGIN_SERVER"
echo "AZURE_CONTAINER_REGISTRY_NAME: $REGISTRY_NAME"
echo "AZURE_CONTAINER_REGISTRY_USERNAME: $REGISTRY_USERNAME"
echo "AZURE_CONTAINER_REGISTRY_PASSWORD: $REGISTRY_PASSWORD"
echo ""

echo "🏗️ Environments:"
echo "AZURE_RESOURCE_GROUP: $RESOURCE_GROUP"
echo "AZURE_RESOURCE_GROUP_STAGING: $RESOURCE_GROUP_STAGING"
echo "AZURE_CONTAINER_APP_ENVIRONMENT: $CONTAINER_APP_ENV"
echo "AZURE_CONTAINER_APP_ENVIRONMENT_STAGING: $CONTAINER_APP_ENV_STAGING"
echo ""

echo "📊 Application Secrets (from your .env):"
echo "MONGODB_URI: (use your production MongoDB URI)"
echo "MONGODB_URI_STAGING: (create a separate staging database)"
echo "REDIS_URL: (use your production Redis URL)"
echo "REDIS_URL_STAGING: (create a separate staging Redis or use same)"
echo "JWT_SECRET: JHbfKC5fLKhgd5\$sa9%3Dgsbd{od,ada}asLJdsad@fwDFLcPZasd"
echo "GEMINI_API_KEY: AIzaSyDCcaQZ7vgCoiI8SKuLjso2zDmb1dE2_D8"
echo "GROQ_API_KEY: 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"
echo ""

echo "🎉 All Azure resources created and credentials generated!"
echo ""
echo "📝 Next steps:"
echo "1. Copy the AZURE_CREDENTIALS JSON above"
echo "2. Go to your GitHub repository → Settings → Secrets and variables → Actions"
echo "3. Add all the secrets listed above"
echo "4. Create staging MongoDB database (optional but recommended)"
echo "5. Push your code to trigger the CI/CD pipeline!"
