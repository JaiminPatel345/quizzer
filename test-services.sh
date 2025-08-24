#!/bin/bash

# Test all microservices endpoints
# Usage: ./test-services.sh <base-url>

BASE_URL=${1:-"http://localhost"}

echo "🧪 Testing Quizzer Microservices"
echo "Base URL: $BASE_URL"
echo ""

# Test Auth Service
echo "📍 Testing Auth Service (Port 3001)..."
curl -s -o /dev/null -w "Status: %{http_code}\n" $BASE_URL:3001/health || echo "❌ Auth Service not accessible"

# Test Quiz Service
echo "📍 Testing Quiz Service (Port 3002)..."
curl -s -o /dev/null -w "Status: %{http_code}\n" $BASE_URL:3002/health || echo "❌ Quiz Service not accessible"

# Test AI Service
echo "📍 Testing AI Service (Port 3003)..."
curl -s -o /dev/null -w "Status: %{http_code}\n" $BASE_URL:3003/health || echo "❌ AI Service not accessible"

# Test Submission Service
echo "📍 Testing Submission Service (Port 3004)..."
curl -s -o /dev/null -w "Status: %{http_code}\n" $BASE_URL:3004/health || echo "❌ Submission Service not accessible"

# Test Analytics Service
echo "📍 Testing Analytics Service (Port 3005)..."
curl -s -o /dev/null -w "Status: %{http_code}\n" $BASE_URL:3005/health || echo "❌ Analytics Service not accessible"

echo ""
echo "📋 Postman Collection Endpoints:"
echo ""
echo "🔐 Auth Service Endpoints:"
echo "  POST $BASE_URL:3001/api/auth/register"
echo "  POST $BASE_URL:3001/api/auth/login"
echo "  GET  $BASE_URL:3001/api/auth/profile"
echo ""
echo "📝 Quiz Service Endpoints:"
echo "  GET  $BASE_URL:3002/api/quizzes"
echo "  POST $BASE_URL:3002/api/quizzes"
echo "  GET  $BASE_URL:3002/api/quizzes/:id"
echo ""
echo "🤖 AI Service Endpoints:"
echo "  POST $BASE_URL:3003/api/ai/generate"
echo "  POST $BASE_URL:3003/api/ai/evaluate"
echo "  POST $BASE_URL:3003/api/ai/hint"
echo ""
echo "📤 Submission Service Endpoints:"
echo "  POST $BASE_URL:3004/api/submissions"
echo "  GET  $BASE_URL:3004/api/submissions/:id"
echo ""
echo "📊 Analytics Service Endpoints:"
echo "  GET  $BASE_URL:3005/api/analytics/dashboard"
echo "  GET  $BASE_URL:3005/api/analytics/leaderboard"
