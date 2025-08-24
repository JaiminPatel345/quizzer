# Azure Deployment Guide - Free Tier

## Prerequisites

### 1. Set up your free databases:

**MongoDB Atlas (Free):**
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account
3. Create a free cluster (M0 Sandbox - 512MB storage)
4. Get your connection string: `mongodb+srv://username:password@cluster.mongodb.net/quizzer?retryWrites=true&w=majority`

**Redis (Free options):**
- [Redis Labs](https://redis.com/try-free/) - 30MB free
- [Upstash](https://upstash.com/) - 10K requests/day free
- [Railway](https://railway.app/) - Free tier with Redis

### 2. Install Azure CLI:
```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

### 3. Ensure you have yarn installed:
```bash
npm install -g yarn
```

## Deployment Steps

### 1. Configure Environment Variables
```bash
cd /home/jaimin/My/Dev/Projects/ppl/quizzer
cp .env.production .env
nano .env
```

Update these values in your `.env` file:
```bash
# External Database Configuration
MONGO_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/quizzer?retryWrites=true&w=majority
REDIS_URL=redis://your-username:your-password@your-redis-host:port

# JWT Secret (generate a strong one)
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long

# AI Service API Keys
GEMINI_API_KEY=your-gemini-api-key
GROQ_API_KEY=your-groq-api-key

# Email Configuration
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-email-app-password

# Azure Configuration
AZURE_RESOURCE_GROUP=quizzer-rg
AZURE_LOCATION=eastus
AZURE_CONTAINER_REGISTRY=quizzerregistry$(date +%s)  # Make it unique
AZURE_CONTAINER_APP_ENV=quizzer-env
```

### 2. Build and Test Locally First
```bash
# Install dependencies for all services
yarn install --workspaces

# Build all services
./infrastructure/scripts/build-all.sh

# Test locally (optional)
docker-compose -f infrastructure/docker/docker-compose.prod.yml up -d
```

### 3. Deploy to Azure
```bash
# Login to Azure
az login

# Run the deployment script
./infrastructure/scripts/deploy-azure-free.sh
```

## What the deployment creates:

1. **Resource Group** - Container for all resources
2. **Container Registry** - Stores your Docker images (~$5/month)
3. **Container Apps Environment** - Serverless container platform (FREE)
4. **5 Container Apps** - One for each microservice (FREE tier)

## Cost Breakdown:

- **Container Apps**: FREE (2M requests/month, 400K GB-seconds)
- **Container Registry**: Basic tier ~$5/month
- **MongoDB**: FREE (MongoDB Atlas M0)
- **Redis**: FREE (using free provider)
- **Total**: ~$5/month

## After Deployment:

You'll get URLs like:
- AI Service: `https://quizzer-ai-service.politerock-12345678.eastus.azurecontainerapps.io`
- Quiz Service: `https://quizzer-quiz-service.politerock-12345678.eastus.azurecontainerapps.io`
- Auth Service: `https://quizzer-auth-service.politerock-12345678.eastus.azurecontainerapps.io`
- Analytics Service: `https://quizzer-analytics-service.politerock-12345678.eastus.azurecontainerapps.io`
- Submission Service: `https://quizzer-submission-service.politerock-12345678.eastus.azurecontainerapps.io`

## Troubleshooting:

### If build fails:
```bash
# Check if yarn.lock exists in each service
ls services/*/yarn.lock

# If missing, create them:
cd services/ai-service && yarn install && cd ../..
cd services/quiz-service && yarn install && cd ../..
# ... repeat for other services
```

### If deployment fails:
```bash
# Check Azure CLI login
az account show

# Check resource group
az group show --name quizzer-rg

# Check container registry
az acr show --name your-registry-name --resource-group quizzer-rg
```

### To update services:
```bash
# Rebuild and push images
./infrastructure/scripts/build-all.sh

# Update specific service
az containerapp update \
  --name quizzer-ai-service \
  --resource-group quizzer-rg \
  --image your-registry.azurecr.io/quizzer-ai-service:latest
```

## Monitoring:

- **Logs**: Use Azure portal or `az containerapp logs show`
- **Metrics**: Available in Azure portal
- **Health checks**: Built into each container

## Scaling:

Your services will automatically scale to 0 when not in use (FREE tier benefit) and scale up when requests come in.
