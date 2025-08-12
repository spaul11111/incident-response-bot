#!/bin/bash

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

NAMESPACE="bot"
RELEASE_NAME="incident-response-bot"

echo -e "${BLUE}🧹 Cleaning up Incident Response Bot deployment${NC}"
echo "=============================================="

# Uninstall Helm release
echo -e "${YELLOW}🗑️  Uninstalling Helm release...${NC}"
helm uninstall ${RELEASE_NAME} -n ${NAMESPACE} || echo "Release not found"

# Delete PVCs (they don't get deleted automatically)
echo -e "${YELLOW}💾 Cleaning up persistent volumes...${NC}"
kubectl delete pvc --all -n ${NAMESPACE} || echo "No PVCs found"

# Delete namespace
echo -e "${YELLOW}🏗️  Deleting namespace...${NC}"
kubectl delete namespace ${NAMESPACE} || echo "Namespace not found"

# Clean up Docker image from minikube
echo -e "${YELLOW}🐳 Cleaning up Docker image from minikube...${NC}"
minikube image rm incident-response-bot:latest || echo "Image not found"

echo -e "${GREEN}✅ Cleanup completed!${NC}"
