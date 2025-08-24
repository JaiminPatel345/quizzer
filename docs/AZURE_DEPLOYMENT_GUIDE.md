# Azure Deployment Guide - Quizzer Microservices

## Overview
This guide provides complete instructions for deploying the Quizzer microservices to Azure Container Apps with optimized Docker images and environment variable management.

## Prerequisites

1. **Azure CLI** installed and configured
2. **Docker** installed
3. **Azure Container Registry** (ACR) created
4. **Azure subscription** with appropriate permissions

## Quick Start

### 1. Setup Azure Container Registry
```bash
# Create resource group
az group create --name quizzer-rg --location eastus

# Create Azure Container Registry
az acr create --resource-group quizzer-rg --name yourregistry --sku Standard --admin-enabled true
```

### 2. Build and Push Images
```bash
# Make sure you're in the project root
cd /path/to/quizzer

# Build and push all services
./build-and-push.sh yourregistry.azurecr.io latest
```

### 3. Deploy to Azure
```bash
# Deploy all services
./deploy-azure.sh quizzer-rg yourregistry.azurecr.io eastus
```

### 4. Test Your Deployment
```bash
# Test all service endpoints
./test-services.sh https://your-base-url
```

## Environment Variables

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://user:pass@cluster.mongodb.net/quizzer` |
| `REDIS_URL` | Redis connection string | `redis://user:pass@redis-host:6379` |
| `JWT_SECRET` | JWT signing secret | `your-super-secret-jwt-key` |
| `GEMINI_API_KEY` | Google Gemini API key | `your-gemini-api-key` |
| `GROQ_API_KEY` | Groq API key | `your-groq-api-key` |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node.js environment |
| `LOG_LEVEL` | `info` | Logging level |
| `CORS_ORIGIN` | `*` | CORS allowed origins |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limiting window |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |

## Managing Environment Variables in Azure

### Using Azure Portal GUI

1. **Navigate to Container Apps**:
   - Go to Azure Portal → Resource Groups → Your Resource Group
   - Click on any Container App (e.g., "auth-service")

2. **Update Environment Variables**:
   - In the left sidebar, click "Containers"
   - Click on your container name
   - Scroll down to "Environment variables"
   - Click "Edit and deploy"

3. **Add/Modify Variables**:
   - Click "+ Add" for new variables
   - For existing variables, click the edit icon
   - Mark sensitive variables as "Secret" (recommended for API keys, passwords)

4. **Apply Changes**:
   - Click "Create" to apply changes
   - The container will automatically restart with new variables

### Using Azure CLI

```bash
# Update a single environment variable
az containerapp update \
  --name auth-service \
  --resource-group quizzer-rg \
  --set-env-vars JWT_SECRET=new-secret-key

# Update multiple variables
az containerapp update \
  --name ai-service \
  --resource-group quizzer-rg \
  --set-env-vars GEMINI_API_KEY=new-key GROQ_API_KEY=another-key

# Add secret environment variables
az containerapp update \
  --name auth-service \
  --resource-group quizzer-rg \
  --secrets mongodb-uri=mongodb://new-connection-string \
  --set-env-vars MONGODB_URI=secretref:mongodb-uri
```

### Using Azure CLI with JSON Configuration

```bash
# Create environment config file
cat > env-config.json << EOF
[
  {
    "name": "MONGODB_URI",
    "secretRef": "mongodb-uri"
  },
  {
    "name": "LOG_LEVEL",
    "value": "debug"
  }
]
EOF

# Apply configuration
az containerapp update \
  --name auth-service \
  --resource-group quizzer-rg \
  --env-vars @env-config.json
```

## Service URLs and Ports

After deployment, your services will be accessible at:

| Service | Port | Health Check | Main Endpoints |
|---------|------|--------------|----------------|
| Auth Service | 3001 | `/health` | `/api/auth/*` |
| Quiz Service | 3002 | `/health` | `/api/quizzes/*` |
| AI Service | 3003 | `/health` | `/api/ai/*` |
| Submission Service | 3004 | `/health` | `/api/submissions/*` |
| Analytics Service | 3005 | `/health` | `/api/analytics/*` |

## Postman Testing

### Import Collection
1. Create a new collection in Postman called "Quizzer Microservices"
2. Set up environment variables in Postman:
   ```
   base_url: https://your-container-app-url
   auth_token: (will be set after login)
   ```

### Sample Requests

#### 1. Register User
```
POST {{base_url}}/api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

#### 2. Login
```
POST {{base_url}}/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

#### 3. Generate Quiz (AI Service)
```
POST {{base_url}}/api/ai/generate
Authorization: Bearer {{auth_token}}
Content-Type: application/json

{
  "topic": "JavaScript",
  "difficulty": "medium",
  "questionCount": 5
}
```

## Scaling and Performance

### Auto-scaling Configuration
The deployment template includes auto-scaling settings:
- **Min Replicas**: 1
- **Max Replicas**: 3-5 (depending on service)
- **CPU-based scaling**: Automatic

### Resource Allocation
- **Auth/Quiz/Submission/Analytics**: 0.5 CPU, 1GB RAM
- **AI Service**: 1 CPU, 2GB RAM (higher due to AI processing)

## Monitoring and Logs

### View Logs
```bash
# View logs for a specific service
az containerapp logs show \
  --name auth-service \
  --resource-group quizzer-rg \
  --follow

# View logs with filtering
az containerapp logs show \
  --name ai-service \
  --resource-group quizzer-rg \
  --filter "level eq 'error'"
```

### Health Monitoring
All services include health check endpoints at `/health` that return service status and dependencies.

## Troubleshooting

### Common Issues

1. **Service Not Starting**:
   - Check environment variables are set correctly
   - Verify MongoDB/Redis connections
   - Check container logs for specific errors

2. **Inter-service Communication Failing**:
   - Ensure all services are in the same Container App Environment
   - Check internal service URLs are correct
   - Verify network policies

3. **Database Connection Issues**:
   - Verify MongoDB URI format and credentials
   - Check MongoDB Atlas IP whitelist includes Azure regions
   - Test connection from local environment first

### Debug Commands
```bash
# Check deployment status
az containerapp show --name auth-service --resource-group quizzer-rg

# View current environment variables
az containerapp show --name auth-service --resource-group quizzer-rg --query "properties.template.containers[0].env"

# Restart a service
az containerapp revision restart --name auth-service --resource-group quizzer-rg
```

## Security Best Practices

1. **Use Secrets for Sensitive Data**: Always mark API keys, passwords, and connection strings as secrets
2. **Limit CORS Origins**: In production, set specific allowed origins instead of `*`
3. **Enable HTTPS**: Azure Container Apps automatically provides HTTPS endpoints
4. **Regular Key Rotation**: Periodically rotate API keys and JWT secrets
5. **Monitor Access Logs**: Use Azure Monitor to track API usage and potential security issues

## Cost Optimization

1. **Right-size Resources**: Monitor CPU/memory usage and adjust allocations
2. **Scale to Zero**: Consider enabling scale-to-zero for non-critical services
3. **Use Spot Instances**: For development environments, consider spot pricing
4. **Monitor Costs**: Set up billing alerts and cost analysis

## Next Steps

1. Set up CI/CD pipeline for automated deployments
2. Configure custom domains and SSL certificates
3. Implement comprehensive monitoring and alerting
4. Set up backup and disaster recovery procedures
5. Consider implementing API Gateway for external access
