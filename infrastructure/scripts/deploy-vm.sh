#!/bin/bash

# Azure VM Deployment Script for Quizzer Microservices
# This script deploys your microservices to a single Azure VM (Most cost-effective for students)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Azure VM Deployment for Quizzer${NC}"

# Load environment variables
if [ -f .env.production ]; then
    source .env.production
    echo -e "${GREEN}✅ Loaded environment variables${NC}"
else
    echo -e "${RED}❌ .env.production file not found. Please create it first.${NC}"
    exit 1
fi

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Login to Azure
echo -e "${YELLOW}🔐 Logging into Azure...${NC}"
az login

# Set subscription if specified
if [ ! -z "$AZURE_SUBSCRIPTION_ID" ]; then
    az account set --subscription $AZURE_SUBSCRIPTION_ID
fi

# Create resource group
echo -e "${YELLOW}📦 Creating resource group...${NC}"
az group create \
    --name $AZURE_RESOURCE_GROUP \
    --location $AZURE_LOCATION

# Create VM
echo -e "${YELLOW}💻 Creating Azure VM...${NC}"
az vm create \
    --resource-group $AZURE_RESOURCE_GROUP \
    --name quizzer-vm \
    --image Ubuntu2204 \
    --size Standard_B1s \
    --admin-username azureuser \
    --generate-ssh-keys \
    --public-ip-sku Standard \
    --output table

# Open ports for services
echo -e "${YELLOW}🔓 Opening ports...${NC}"
az vm open-port --resource-group $AZURE_RESOURCE_GROUP --name quizzer-vm --port 80
az vm open-port --resource-group $AZURE_RESOURCE_GROUP --name quizzer-vm --port 443
az vm open-port --resource-group $AZURE_RESOURCE_GROUP --name quizzer-vm --port 22

# Get VM public IP
VM_IP=$(az vm show --resource-group $AZURE_RESOURCE_GROUP --name quizzer-vm --show-details --query publicIps --output tsv)
echo -e "${GREEN}✅ VM created with IP: $VM_IP${NC}"

# Create setup script for VM
cat > vm-setup.sh << 'EOF'
#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo apt install -y git

# Clone repository (you'll need to replace this with your actual repo)
git clone https://github.com/JaiminPatel345/quizzer.git
cd quizzer

# Copy environment file
cp .env.production .env

# Build and start services
cd infrastructure/docker
docker-compose -f docker-compose.prod.yml up -d

echo "🎉 Quizzer microservices are now running!"
echo "Access your application at: http://$VM_IP"
EOF

# Copy files to VM
echo -e "${YELLOW}📁 Copying files to VM...${NC}"
scp -o StrictHostKeyChecking=no vm-setup.sh azureuser@$VM_IP:~/
scp -o StrictHostKeyChecking=no .env.production azureuser@$VM_IP:~/

# Run setup on VM
echo -e "${YELLOW}⚙️ Setting up services on VM...${NC}"
ssh -o StrictHostKeyChecking=no azureuser@$VM_IP 'chmod +x vm-setup.sh && ./vm-setup.sh'

echo -e "${GREEN}🎉 Deployment completed!${NC}"
echo -e "${BLUE}Your application is available at: http://$VM_IP${NC}"
echo -e "${YELLOW}SSH into your VM: ssh azureuser@$VM_IP${NC}"

# Cleanup
rm vm-setup.sh
