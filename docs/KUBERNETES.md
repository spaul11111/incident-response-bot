# Kubernetes Deployment Guide

This guide shows how to deploy the Incident Response Bot to Kubernetes using Helm charts with ConfigMaps, Secrets, and a PostgreSQL database.

## 📋 Prerequisites

1. **Minikube** (for local deployment)
   ```bash
   # Install minikube
   brew install minikube
   
   # Start minikube
   minikube start --cpus=4 --memory=4096
   ```

2. **Helm** (package manager for Kubernetes)
   ```bash
   # Install Helm
   brew install helm
   ```

3. **kubectl** (Kubernetes CLI)
   ```bash
   # Should be installed with minikube, verify:
   kubectl version --client
   ```

4. **Docker** (for building images)
   ```bash
   # Verify Docker is running
   docker version
   ```

## 🚀 Quick Deployment

### 1. Update Slack Tokens
Edit `helm/values-local.yaml` and add your real Slack tokens:

```yaml
slack:
  botToken: "xoxb-your-actual-bot-token"
  signingSecret: "your-actual-signing-secret"
  appToken: "xapp-your-actual-app-token"  # Optional for Socket Mode
```

### 2. Deploy to Minikube
```bash
# Build and deploy everything
npm run k8s:deploy
```

This script will:
- ✅ Build the Docker image
- ✅ Load it into minikube
- ✅ Create the `bot` namespace
- ✅ Add necessary Helm repositories
- ✅ Deploy PostgreSQL database
- ✅ Deploy the bot with ConfigMaps and Secrets
- ✅ Set up monitoring (ServiceMonitor for Prometheus)

### 3. Verify Deployment
```bash
# Check pod status
kubectl get pods -n bot

# Check services
kubectl get svc -n bot

# View logs
npm run k8s:logs
```

### 4. Access the Bot
```bash
# Port forward to access locally
npm run k8s:port-forward

# Then visit:
# http://localhost:3000/health
# http://localhost:3000/metrics
```

## 🏗️ Architecture Overview

The Helm chart deploys:

### Core Components
- **Deployment**: The main bot application
- **Service**: ClusterIP service exposing port 3000
- **ConfigMap**: Non-sensitive configuration (NODE_ENV, PORT, etc.)
- **Secret**: Sensitive data (Slack tokens, database credentials)
- **ServiceAccount**: RBAC for the bot pod

### Database Options
- **PostgreSQL** (default): Full-featured database via Bitnami chart
- **SQLite**: Lightweight option with persistent volume

### Monitoring Stack
- **ServiceMonitor**: For Prometheus to scrape metrics
- **PodAnnotations**: Prometheus discovery
- **Grafana**: Dashboard support (via dependency)

### Security Features
- **Non-root containers**: Runs as user 1000
- **Read-only root filesystem**: Enhanced security
- **Resource limits**: CPU and memory constraints
- **Security contexts**: Drop all capabilities

## 📊 Configuration Options

### Database Configuration
```yaml
# Use PostgreSQL (recommended)
postgresql:
  enabled: true
  auth:
    database: "incident_response"
    username: "incident_user"

# Or use SQLite
postgresql:
  enabled: false
persistence:
  enabled: true
  size: 1Gi
```

### Monitoring Configuration
```yaml
monitoring:
  enabled: true
  prometheus:
    serviceMonitor:
      enabled: true
      interval: 30s
  grafana:
    dashboards:
      enabled: true
```

### Resource Management
```yaml
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi

autoscaling:
  enabled: true
  minReplicas: 1
  maxReplicas: 3
  targetCPUUtilizationPercentage: 80
```

## 🔧 Advanced Usage

### Custom Values File
Create a custom values file for your environment:

```bash
# Copy the template
cp helm/values-local.yaml helm/values-production.yaml

# Deploy with custom values
helm upgrade --install incident-response-bot helm/incident-response-bot \
  --namespace bot \
  --values helm/values-production.yaml
```

### Enable Ingress
```yaml
ingress:
  enabled: true
  className: "nginx"
  hosts:
    - host: incident-bot.your-domain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: incident-bot-tls
      hosts:
        - incident-bot.your-domain.com
```

### Production Deployment
For production, consider:

1. **External Database**: Use managed PostgreSQL (AWS RDS, etc.)
2. **Secrets Management**: Use external secret management (Vault, etc.)
3. **Monitoring**: Deploy full Prometheus/Grafana stack
4. **Scaling**: Enable HPA and resource quotas
5. **Security**: Network policies, Pod Security Standards

## 🛠️ Troubleshooting

### Common Issues

1. **Image Pull Errors**
   ```bash
   # Verify image is loaded
   minikube image ls | grep incident-response-bot
   
   # Rebuild and reload
   docker build -t incident-response-bot:latest .
   minikube image load incident-response-bot:latest
   ```

2. **Database Connection Issues**
   ```bash
   # Check PostgreSQL pod
   kubectl get pods -n bot | grep postgresql
   
   # Check logs
   kubectl logs -l app.kubernetes.io/name=postgresql -n bot
   ```

3. **ConfigMap/Secret Issues**
   ```bash
   # Verify ConfigMap
   kubectl get configmap -n bot
   kubectl describe configmap incident-response-bot-config -n bot
   
   # Verify Secret
   kubectl get secret -n bot
   kubectl describe secret incident-response-bot-slack -n bot
   ```

### Debugging Commands
```bash
# Get all resources
kubectl get all -n bot

# Describe deployment
kubectl describe deployment incident-response-bot -n bot

# Execute into pod
kubectl exec -it deployment/incident-response-bot -n bot -- /bin/sh

# Port forward for debugging
kubectl port-forward deployment/incident-response-bot 3000:3000 -n bot
```

## 🧹 Cleanup

To remove everything:
```bash
npm run k8s:cleanup
```

This will:
- Uninstall the Helm release
- Delete persistent volumes
- Remove the namespace
- Clean up Docker images

## 📝 Next Steps

1. **Set up Slack App**: Configure slash commands to point to your ingress
2. **Monitoring**: Access Grafana dashboards for bot metrics
3. **Alerts**: Configure alerting rules in Prometheus
4. **CI/CD**: Integrate with your deployment pipeline
5. **Scaling**: Set up autoscaling based on metrics

For more advanced configurations, see the [Helm Chart Documentation](../helm/incident-response-bot/README.md).
