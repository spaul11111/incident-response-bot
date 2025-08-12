#!/bin/bash

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="bot"
RELEASE_NAME="incident-response-bot"
CHART_PATH="./helm/incident-response-bot"
VALUES_FILE="./helm/values-local.yaml"

echo -e "${BLUE}🚀 Deploying Incident Response Bot to Minikube${NC}"
echo "========================================"

# Check if minikube is running
if ! minikube status &> /dev/null; then
    echo -e "${RED}❌ Minikube is not running. Please start it first:${NC}"
    echo "   minikube start"
    exit 1
fi

# Check if Docker image exists
if ! docker images | grep -q "incident-response-bot"; then
    echo -e "${YELLOW}⚠️  Docker image not found. Building...${NC}"
    docker build -t incident-response-bot:latest .
fi

# Load image into minikube
echo -e "${YELLOW}📦 Loading Docker image into minikube...${NC}"
minikube image load incident-response-bot:latest

# Create namespace if it doesn't exist
echo -e "${YELLOW}🏗️  Creating namespace '${NAMESPACE}'...${NC}"
kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

# Add Helm repositories
echo -e "${YELLOW}📚 Adding Helm repositories...${NC}"
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install/upgrade the Helm chart
echo -e "${YELLOW}🎯 Deploying Helm chart...${NC}"
helm upgrade --install ${RELEASE_NAME} ${CHART_PATH} \
    --namespace ${NAMESPACE} \
    --values ${VALUES_FILE} \
    --wait \
    --timeout=10m

# Wait for deployment to be ready
echo -e "${YELLOW}⏳ Waiting for deployment to be ready...${NC}"
kubectl wait --for=condition=available --timeout=300s deployment/${RELEASE_NAME} -n ${NAMESPACE}

# Get service information
echo -e "${GREEN}✅ Deployment successful!${NC}"
echo ""
echo -e "${BLUE}📊 Service Information:${NC}"
kubectl get pods,svc,pvc -n ${NAMESPACE}

echo ""
echo -e "${BLUE}🔗 Access URLs:${NC}"
echo "Health Check: http://$(minikube ip):$(kubectl get svc ${RELEASE_NAME} -n ${NAMESPACE} -o jsonpath='{.spec.ports[0].nodePort}')/health"
echo "Metrics: http://$(minikube ip):$(kubectl get svc ${RELEASE_NAME} -n ${NAMESPACE} -o jsonpath='{.spec.ports[0].nodePort}')/metrics"

echo ""
echo -e "${BLUE}📝 Useful commands:${NC}"
echo "  kubectl logs -f deployment/${RELEASE_NAME} -n ${NAMESPACE}"
echo "  kubectl port-forward svc/${RELEASE_NAME} 3000:3000 -n ${NAMESPACE}"
echo "  helm uninstall ${RELEASE_NAME} -n ${NAMESPACE}"

echo ""
echo -e "${GREEN}🎉 Bot is running in the '${NAMESPACE}' namespace!${NC}"
