# 🔐 Secrets Management Guide

This guide explains how to manage sensitive configuration like Slack tokens for local development, CI/CD, and production deployments.

## 🏠 Local Development

### Option 1: Environment Variables (.env file)
Your `.env` file contains your actual tokens for local development:
```bash
SLACK_BOT_TOKEN=xoxb-your-actual-token
SLACK_SIGNING_SECRET=your-actual-secret
SLACK_APP_TOKEN=xapp-your-actual-token
```

### Option 2: Helm Override File
For Kubernetes deployment, create an override file:
```bash
# Copy the example
cp helm/values-local-override.yaml.example helm/values-local-override.yaml

# Edit with your actual tokens
vim helm/values-local-override.yaml
```

The deployment script will automatically use this file if it exists.

## 🔄 CI/CD Pipeline (GitHub Actions)

Your Slack tokens are stored as GitHub repository secrets:

### Current Secrets
- `SLACK_BOT_TOKEN`: Your Slack bot token (xoxb-...)
- `SLACK_SIGNING_SECRET`: Your Slack app signing secret
- `SLACK_APP_TOKEN`: Your Slack app token (xapp-...)
- `DATABASE_URL`: Database connection string

### How They're Used
1. **Testing**: CI/CD workflow uses secrets for environment variable testing
2. **Building**: Docker images are built without embedding secrets
3. **Deployment**: Helm values are generated with actual secrets during deployment

### View/Update Secrets
```bash
# List all secrets
gh secret list

# Update a secret
gh secret set SLACK_BOT_TOKEN --body "new-token-value"

# Add a new secret
gh secret set NEW_SECRET --body "secret-value"
```

## 🚀 Production Deployment

### Option 1: External Secret Management
For production, consider using:
- **AWS Secrets Manager**: Store secrets in AWS
- **Azure Key Vault**: Store secrets in Azure
- **HashiCorp Vault**: Self-hosted secret management
- **Kubernetes Secrets**: Direct kubectl/Helm secret creation

### Option 2: Kubernetes External Secrets Operator
Use the External Secrets Operator to sync secrets from external systems:
```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
```

### Option 3: CI/CD Environment-Specific Secrets
Create environment-specific secret sets:
```bash
# Staging secrets
gh secret set SLACK_BOT_TOKEN_STAGING --body "staging-token"

# Production secrets  
gh secret set SLACK_BOT_TOKEN_PROD --body "production-token"
```

## 🛡️ Security Best Practices

### ✅ Do's
- Store secrets in GitHub repository secrets for CI/CD
- Use override files (gitignored) for local development
- Rotate tokens regularly
- Use least-privilege principle for bot permissions
- Monitor secret usage in GitHub security tab

### ❌ Don'ts
- Never commit actual tokens to Git
- Don't embed secrets in Docker images
- Don't use production tokens in development
- Don't share tokens in chat/email
- Don't use the same tokens across environments

## 🔍 Secret Rotation

When rotating Slack tokens:

1. **Generate new tokens** in Slack app settings
2. **Update GitHub secrets**:
   ```bash
   gh secret set SLACK_BOT_TOKEN --body "new-xoxb-token"
   gh secret set SLACK_SIGNING_SECRET --body "new-signing-secret"
   ```
3. **Update local override file**:
   ```bash
   vim helm/values-local-override.yaml
   ```
4. **Redeploy applications** to pick up new secrets

## 🚨 Incident Response

If secrets are compromised:

1. **Immediately revoke** tokens in Slack app settings
2. **Generate new tokens** with minimal required permissions
3. **Update all secret stores** (GitHub, local files, etc.)
4. **Redeploy applications** to use new tokens
5. **Audit logs** to determine scope of potential access

## 📊 Monitoring & Auditing

### GitHub Secret Scanning
- GitHub automatically scans for leaked secrets
- Alerts appear in Security tab
- Push protection prevents accidental commits

### Slack App Monitoring
- Monitor bot usage in Slack app analytics
- Set up alerts for unusual activity
- Regular audit of app permissions

### Kubernetes Secret Monitoring
```bash
# Check secret usage
kubectl get secrets -n bot
kubectl describe secret incident-response-bot-slack -n bot

# Audit secret access
kubectl get events -n bot | grep secret
```

Your secrets are now properly managed across all environments! 🎉
