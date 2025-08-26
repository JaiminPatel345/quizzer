# Azure Deployment Guide for Quizzer Micro### Step 3: Configure GitHub Repository Secrets

After running the setup script, add these secrets to your GitHub repository:

1. Go to: `https://github.com/JaiminPatel345/quizzer/settings/secrets/actions`
2. Click "New repository secret"
3. Add the following secrets (values will be provided by the setup script):

- `AZURE_CREDENTIALS`: Service principal credentials (JSON format)
- `REGISTRY_USERNAME`: Container registry username
- `REGISTRY_PASSWORD`: Container registry password
- `CONTAINER_REGISTRY_NAME`: Your unique container registry name (auto-generated)zure Student Optimized)

This guide will help you deploy your Express.js microservices to Azure using Docker containers and GitHub Actions, optimized for Azure Student subscriptions to minimize costs.

## 🎓 Azure Student Benefits

- **$100 USD credit per month** for 12 months
- **Free tier services** available
- **No credit card required** for sign-up
- Perfect for learning and small projects

## Prerequisites

- Azure Student account ([Sign up here](https://azure.microsoft.com/en-us/free/students/))
- Azure CLI installed and logged in
- GitHub repository access
- Docker installed (for local testing)
- Node.js 20+ (required by some dependencies like joi@18.0.1)

## Step-by-Step Deployment Process

### Step 1: Azure CLI Login
```bash
# Login to Azure
az login

# Verify you're logged into the correct subscription
az account show
```

### Step 2: Run Azure Setup Script
```bash
# Run the automated setup script
./azure-setup.sh
```

This script will:
- Create a resource group named `quizzer-rg`
- Create an Azure Container Registry named `quizzerregistry` (Basic SKU - $5/month)
- Create a service principal for GitHub Actions
- Set up proper permissions
- Optimize for Azure Student costs

### Step 3: Configure GitHub Secrets

After running the setup script, add these secrets to your GitHub repository:

1. Go to: `https://github.com/JaiminPatel345/quizzer/settings/secrets/actions`
2. Click "New repository secret"
3. Add the following secrets (values will be provided by the setup script):

- `AZURE_CREDENTIALS`: Service principal credentials (JSON format)
- `REGISTRY_USERNAME`: Container registry username
- `REGISTRY_PASSWORD`: Container registry password

### Step 4: Deploy via GitHub Actions

1. Push your code to the `microservices` branch:
```bash
git add .
git commit -m "Add Azure deployment configuration"
git push origin microservices
```

2. The GitHub Actions workflow will automatically:
   - Build all microservices
   - Create Docker images
   - Push images to Azure Container Registry
   - Deploy containers to Azure Container Instances

### Step 5: Verify Deployment

Run the verification script to check deployment status:
```bash
./azure-verify.sh
```

## Service URLs

After successful deployment, your services will be available at:

- **AI Service**: `http://<ai-service-ip>:3001`
- **Analytics Service**: `http://<analytics-service-ip>:3002`
- **Auth Service**: `http://<auth-service-ip>:3003`
- **Quiz Service**: `http://<quiz-service-ip>:3004`
- **Submission Service**: `http://<submission-service-ip>:3005`

## Manual Azure CLI Commands

### Create Resources Manually (if needed)

```bash
# Create resource group
az group create --name quizzer-rg --location eastus

# Create container registry
az acr create --resource-group quizzer-rg --name quizzerregistry --sku Basic --admin-enabled true

# Get registry credentials
az acr credential show --name quizzerregistry
```

### Build and Push Images Manually

```bash
# Login to registry
az acr login --name quizzerregistry

# Build and push AI service
docker build -t quizzerregistry.azurecr.io/ai-service:latest services/ai-service
docker push quizzerregistry.azurecr.io/ai-service:latest

# Build and push other services (repeat for each service)
```

### Deploy Container Instances Manually

```bash
# Deploy AI service
az container create \
  --resource-group quizzer-rg \
  --name ai-service \
  --image quizzerregistry.azurecr.io/ai-service:latest \
  --registry-login-server quizzerregistry.azurecr.io \
  --registry-username <username> \
  --registry-password <password> \
  --ports 3001 \
  --cpu 1 \
  --memory 1.5 \
  --environment-variables NODE_ENV=production PORT=3001 \
  --restart-policy Always
```

## Monitoring and Maintenance

### View Container Logs
```bash
az container logs --resource-group quizzer-rg --name ai-service
```

### Restart a Service
```bash
az container restart --resource-group quizzer-rg --name ai-service
```

### Check Container Status
```bash
az container show --resource-group quizzer-rg --name ai-service --query instanceView.state
```

### Scale Resources (if needed)
```bash
# Update container with more resources
az container create \
  --resource-group quizzer-rg \
  --name ai-service \
  --image quizzerregistry.azurecr.io/ai-service:latest \
  --cpu 2 \
  --memory 3 \
  # ... other parameters
```

## Environment Variables

Add environment variables to your containers by modifying the GitHub Actions workflow or using Azure CLI:

```bash
az container create \
  # ... other parameters
  --environment-variables \
    NODE_ENV=production \
    PORT=3001 \
    DATABASE_URL=your-database-url \
    JWT_SECRET=your-jwt-secret \
    REDIS_URL=your-redis-url
```

## Troubleshooting

### Common Issues

1. **Build Failures**: Check that all package.json files have correct build scripts
2. **Container Start Failures**: Verify Dockerfile and ensure health checks pass
3. **Network Issues**: Check Azure Container Instance security groups and ports
4. **Registry Authentication**: Ensure service principal has AcrPush permissions

### Debug Commands

```bash
# Check resource group resources
az resource list --resource-group quizzer-rg --output table

# Check container registry repositories
az acr repository list --name quizzerregistry

# Check container instance details
az container show --resource-group quizzer-rg --name ai-service

# Check logs for errors
az container logs --resource-group quizzer-rg --name ai-service --tail 100
```

## Cleanup

To remove all Azure resources:
```bash
./azure-cleanup.sh
```

Or manually:
```bash
az group delete --name quizzer-rg --yes --no-wait
```

## Cost Optimization

- Use Azure Container Instances for development/testing
- Consider Azure Container Apps or AKS for production workloads
- Monitor resource usage and adjust CPU/memory allocations
- Use Azure Cost Management to track expenses

## 💰 Cost Optimization for Azure Student

### Monthly Cost Breakdown (Optimized)

| Service | Resource | Cost/Month |
|---------|----------|------------|
| Container Registry (Basic) | 1 registry | ~$5 |
| AI Service | 0.5 CPU, 1GB RAM | ~$3-5 |
| Analytics Service | 0.5 CPU, 1GB RAM | ~$3-5 |
| Auth Service | 0.5 CPU, 1GB RAM | ~$3-5 |
| Quiz Service | 0.5 CPU, 1GB RAM | ~$3-5 |
| Submission Service | 0.5 CPU, 1GB RAM | ~$3-5 |
| **Total Estimated** | | **~$20-30/month** |

**Azure Student Credit: $100/month** → **Remaining: $70-80/month** for other projects!

### Cost Saving Features Implemented

✅ **Minimized Resources**: 0.5 CPU, 1GB RAM per service (minimum viable)
✅ **Basic SKU Registry**: Cheapest option available
✅ **OnFailure Restart Policy**: Only runs when needed
✅ **External Database**: Using MongoDB Atlas/Redis Cloud (free tiers)
✅ **Optimized Docker Images**: Multi-stage builds with Alpine Linux

### Additional Cost Management

Use the provided scripts for cost control:

```bash
# Monitor current costs and usage
./azure-cost-monitor.sh

# Stop all services when not in use (saves ~80% of costs)
./azure-manage.sh stop

# Start services when needed
./azure-manage.sh start

# Check status
./azure-manage.sh status
```

## Security Best Practices

- Store sensitive data in Azure Key Vault
- Use managed identities when possible
- Enable container registry webhook for automated updates
- Implement proper CORS and security headers in your applications
- Use HTTPS with proper SSL certificates for production

## 🛠️ Smart Container Management

### Start/Stop Services to Save Money

```bash
# Stop all services when not developing (saves ~$15-20/month)
./azure-manage.sh stop

# Start all services when you need them
./azure-manage.sh start

# Stop just one service
./azure-manage.sh stop ai-service

# Check what's running (and costing money)
./azure-manage.sh status

# View logs for debugging
./azure-manage.sh logs auth-service
```

### Recommended Usage Pattern

1. **Development Phase**: Keep services running during active development
2. **Testing Phase**: Start services only when testing
3. **Demo Phase**: Start services before demos, stop after
4. **Idle Time**: Stop all services to minimize costs

**Example Monthly Cost with Smart Management:**
- Running 8 hours/day, 5 days/week: ~$8-12/month
- Running 24/7: ~$20-30/month
- Your choice based on usage needs!

## 📊 Monitoring Your Azure Student Account

### Check Your Credits
```bash
# Monitor costs and remaining credits
./azure-cost-monitor.sh

# Or visit Azure Student dashboard
# https://www.microsoftazurestudents.com/
```

### Cost Alerts (Recommended)
1. Go to [Azure Cost Management](https://portal.azure.com/#blade/Microsoft_Azure_CostManagement/Menu/overview)
2. Set up budget alerts at $50 and $80
3. Get notified before hitting your $100 limit
