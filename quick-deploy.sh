#!/bin/bash

# Quick Azure Container Instances Deployment Script
# This script deploys your working containers with proper environment variables

set -e

# Load environment variables
source .env

echo "🚀 Deploying Quizzer Platform to Azure Container Instances..."
echo "Using MongoDB: ${MONGODB_URI:0:30}..."
echo "Using Redis: ${REDIS_URL:0:30}..."

# Registry info
REGISTRY="quizzerregistry1756067615"
ACR_LOGIN_SERVER="${REGISTRY}.azurecr.io"
TIMESTAMP=$(date +%s)

# Get ACR credentials
echo "Getting ACR credentials..."
ACR_USERNAME=$(az acr credential show --name $REGISTRY --query "username" --output tsv)
ACR_PASSWORD=$(az acr credential show --name $REGISTRY --query "passwords[0].value" --output tsv)

echo "🔐 Deploying Auth Service..."
az container create \
    --resource-group quizzer \
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
        NODE_ENV=production \
        MONGODB_URI="$MONGODB_URI" \
        REDIS_URL="$REDIS_URL" \
        JWT_SECRET="$JWT_SECRET" \
        PORT=3001

# Get auth service URL
AUTH_FQDN=$(az container show --resource-group quizzer --name "auth-service" --query "ipAddress.fqdn" --output tsv)
AUTH_SERVICE_URL="http://$AUTH_FQDN:3001"

echo "🤖 Deploying AI Service..."
az container create \
    --resource-group quizzer \
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
        NODE_ENV=production \
        MONGODB_URI="$MONGODB_URI" \
        REDIS_URL="$REDIS_URL" \
        GEMINI_API_KEY="$GEMINI_API_KEY" \
        GROQ_API_KEY="$GROQ_API_KEY" \
        AUTH_SERVICE_URL="$AUTH_SERVICE_URL" \
        PORT=3002

# Get AI service URL
AI_FQDN=$(az container show --resource-group quizzer --name "ai-service" --query "ipAddress.fqdn" --output tsv)
AI_SERVICE_URL="http://$AI_FQDN:3002"

echo "📝 Deploying Quiz Service..."
az container create \
    --resource-group quizzer \
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
        NODE_ENV=production \
        MONGODB_URI="$MONGODB_URI" \
        REDIS_URL="$REDIS_URL" \
        AUTH_SERVICE_URL="$AUTH_SERVICE_URL" \
        AI_SERVICE_URL="$AI_SERVICE_URL" \
        EMAIL_USER="$EMAIL_USER" \
        EMAIL_PASSWORD="$EMAIL_PASSWORD" \
        PORT=3003

# Get quiz service URL
QUIZ_FQDN=$(az container show --resource-group quizzer --name "quiz-service" --query "ipAddress.fqdn" --output tsv)
QUIZ_SERVICE_URL="http://$QUIZ_FQDN:3003"

echo "📊 Deploying Analytics Service..."
az container create \
    --resource-group quizzer \
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
        NODE_ENV=production \
        MONGODB_URI="$MONGODB_URI" \
        REDIS_URL="$REDIS_URL" \
        AUTH_SERVICE_URL="$AUTH_SERVICE_URL" \
        QUIZ_SERVICE_URL="$QUIZ_SERVICE_URL" \
        PORT=3005

# Get analytics service URL
ANALYTICS_FQDN=$(az container show --resource-group quizzer --name "analytics-service" --query "ipAddress.fqdn" --output tsv)
ANALYTICS_SERVICE_URL="http://$ANALYTICS_FQDN:3005"

echo "📋 Deploying Submission Service..."
az container create \
    --resource-group quizzer \
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
        NODE_ENV=production \
        MONGODB_URI="$MONGODB_URI" \
        REDIS_URL="$REDIS_URL" \
        AUTH_SERVICE_URL="$AUTH_SERVICE_URL" \
        QUIZ_SERVICE_URL="$QUIZ_SERVICE_URL" \
        AI_SERVICE_URL="$AI_SERVICE_URL" \
        ANALYTICS_SERVICE_URL="$ANALYTICS_SERVICE_URL" \
        PORT=3004

# Get submission service URL
SUBMISSION_FQDN=$(az container show --resource-group quizzer --name "submission-service" --query "ipAddress.fqdn" --output tsv)
SUBMISSION_SERVICE_URL="http://$SUBMISSION_FQDN:3004"

echo ""
echo "🎉 DEPLOYMENT COMPLETE! 🎉"
echo ""
echo "🌐 Your Quizzer Platform is now live on Azure:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Auth Service:       $AUTH_SERVICE_URL"
echo "🤖 AI Service:         $AI_SERVICE_URL"
echo "📝 Quiz Service:       $QUIZ_SERVICE_URL"
echo "📊 Analytics Service:  $ANALYTICS_SERVICE_URL"
echo "📋 Submission Service: $SUBMISSION_SERVICE_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🧪 Test your services:"
echo "curl $AUTH_SERVICE_URL/health"
echo "curl $AI_SERVICE_URL/health"
echo "curl $QUIZ_SERVICE_URL/health"
echo "curl $ANALYTICS_SERVICE_URL/health"
echo "curl $SUBMISSION_SERVICE_URL/health"
echo ""
echo "🗂️  Your Docker images are stored in: $ACR_LOGIN_SERVER"
echo "💰 Estimated cost: ~$5-10/month for Azure for Students"
echo ""
echo "✅ All services are connected to your online MongoDB Atlas and Redis Cloud!"
