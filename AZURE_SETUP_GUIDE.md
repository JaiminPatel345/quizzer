# Azure Setup Guide for GitHub Actions CI/CD

This guide will walk you through setting up Azure resources and GitHub secrets for your microservices CI/CD pipeline.

## Step 1: Create Azure Container Registry (ACR)

1. **Login to Azure Portal** (https://portal.azure.com)

2. **Create Container Registry:**
   - Search for "Container registries" in the search bar
   - Click "Create"
   - Fill in the details:
     - **Subscription**: Select your subscription
     - **Resource group**: Create new or select existing (e.g., `quizzer-rg`)
     - **Registry name**: Choose a unique name (e.g., `quizzerregistry`)
     - **Location**: Choose your preferred region
     - **SKU**: Select "Basic" for development, "Standard" for production
   - Click "Review + create" then "Create"

3. **Enable Admin User:**
   - Go to your Container Registry
   - Navigate to "Access keys" in the left menu
   - Enable "Admin user"
   - Note down the **Registry name**, **Login server**, **Username**, and **Password**

## Step 2: Create Container Apps Environment

1. **Create Container Apps Environment:**
   - Search for "Container Apps" in Azure Portal
   - Click "Create"
   - Create a new Container Apps Environment:
     - **Subscription**: Select your subscription
     - **Resource group**: Use same as ACR (e.g., `quizzer-rg`)
     - **Environment name**: e.g., `quizzer-env`
     - **Region**: Same as your ACR
   - Click "Review + create" then "Create"

## Step 3: Create Service Principal for GitHub Actions

1. **Open Azure Cloud Shell:**
   - Click the Cloud Shell icon in Azure Portal (>_)
   - Choose Bash

2. **Create Service Principal:**
   ```bash
   # Replace with your subscription ID and resource group name
   SUBSCRIPTION_ID="your-subscription-id"
   RESOURCE_GROUP="quizzer-rg"
   
   # Create service principal
   az ad sp create-for-rbac \
     --name "github-actions-quizzer" \
     --role "Contributor" \
     --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" \
     --sdk-auth
   ```

3. **Copy the JSON output** - you'll need this for GitHub secrets

## Step 4: Get Required Information

1. **Subscription ID:**
   ```bash
   az account show --query id --output tsv
   ```

2. **Resource Group Name:** (e.g., `quizzer-rg`)

3. **Container Registry Information:**
   - Registry name (without .azurecr.io)
   - Login server (full URL with .azurecr.io)
   - Username and password from Step 1

4. **Container Apps Environment Name:** (e.g., `quizzer-env`)

## Step 5: Set up GitHub Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Create the following **Repository Secrets**:

### Azure Credentials
- **AZURE_CREDENTIALS**: Paste the JSON output from Step 3
- **AZURE_SUBSCRIPTION_ID**: Your subscription ID

### Container Registry
- **AZURE_CONTAINER_REGISTRY**: Login server (e.g., `quizzerregistry.azurecr.io`)
- **AZURE_CONTAINER_REGISTRY_NAME**: Registry name only (e.g., `quizzerregistry`)
- **AZURE_CONTAINER_REGISTRY_USERNAME**: Username from ACR access keys
- **AZURE_CONTAINER_REGISTRY_PASSWORD**: Password from ACR access keys

### Resource Groups and Environments
- **AZURE_RESOURCE_GROUP**: Production resource group name (e.g., `quizzer-rg`)
- **AZURE_RESOURCE_GROUP_STAGING**: Staging resource group name (e.g., `quizzer-staging-rg`)
- **AZURE_CONTAINER_APP_ENVIRONMENT**: Production environment name (e.g., `quizzer-env`)
- **AZURE_CONTAINER_APP_ENVIRONMENT_STAGING**: Staging environment name (e.g., `quizzer-staging-env`)

### Application Secrets
- **MONGODB_URI**: Your MongoDB connection string for production
- **MONGODB_URI_STAGING**: Your MongoDB connection string for staging
- **REDIS_URL**: Your Redis connection string for production
- **REDIS_URL_STAGING**: Your Redis connection string for staging
- **JWT_SECRET**: Your JWT secret key
- **GEMINI_API_KEY**: Your Gemini API key
- **GROQ_API_KEY**: Your Groq API key

## Step 6: Create Staging Environment (Optional)

If you want separate staging resources:

1. **Create Staging Resource Group:**
   ```bash
   az group create --name quizzer-staging-rg --location eastus
   ```

2. **Create Staging Container Apps Environment:**
   - Follow Step 2 but use staging resource group and different environment name

## Step 7: Test the Pipeline

1. **Push code to trigger deployment:**
   ```bash
   git add .
   git commit -m "Setup CI/CD pipeline"
   git push origin main
   ```

2. **Monitor the deployment:**
   - Go to GitHub repository → Actions tab
   - Watch the workflow execution

## Troubleshooting

### Common Issues:

1. **Permission Denied:**
   - Ensure service principal has Contributor role
   - Check resource group permissions

2. **Registry Access Denied:**
   - Verify ACR admin user is enabled
   - Check username/password in GitHub secrets

3. **Container App Creation Failed:**
   - Ensure Container Apps Environment exists
   - Check resource group and subscription permissions

4. **Build Failures:**
   - Check Dockerfile exists in each service directory
   - Verify Node.js version compatibility

### Useful Commands:

```bash
# Check service principal permissions
az role assignment list --assignee <service-principal-id>

# Test ACR login
az acr login --name <registry-name>

# List container apps
az containerapp list --resource-group <resource-group>

# View container app logs
az containerapp logs show --name <app-name> --resource-group <resource-group>
```

## Security Best Practices

1. **Use separate environments** for staging and production
2. **Rotate secrets regularly** (service principal credentials, API keys)
3. **Use managed identities** where possible instead of service principals
4. **Monitor resource access** through Azure Activity Log
5. **Set up proper RBAC** with minimal required permissions

## Cost Optimization

1. **Use Basic SKU for ACR** in development
2. **Scale down non-production environments** when not in use
3. **Set up budget alerts** in Azure
4. **Use spot instances** for development workloads
5. **Clean up old container images** regularly

---

## Next Steps

After setting up the pipeline:

1. Test with a small change to verify deployment works
2. Set up monitoring and alerting for your applications
3. Configure custom domains and SSL certificates
4. Set up database backups and disaster recovery
5. Implement proper logging and monitoring solutions
