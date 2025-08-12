# Incident Response Bot Helm Chart

This Helm chart deploys the Incident Response Bot to Kubernetes with PostgreSQL database, monitoring, and security best practices.

## Quick Start

1. **Add your Slack tokens to values file:**
   ```bash
   cp ../values-local.yaml values-custom.yaml
   # Edit values-custom.yaml with your actual tokens
   ```

2. **Install the chart:**
   ```bash
   helm install incident-response-bot . \
     --namespace bot \
     --create-namespace \
     --values values-custom.yaml
   ```

## Configuration

### Required Values
- `slack.botToken`: Your Slack bot token (xoxb-...)
- `slack.signingSecret`: Your Slack app signing secret

### Database Options
- **PostgreSQL** (default): Full-featured database
- **SQLite**: Lightweight with persistent storage

### Monitoring
- ServiceMonitor for Prometheus
- Pod annotations for metrics scraping
- Grafana dashboard support

## Security Features
- Non-root containers
- Read-only root filesystem
- Resource limits
- Security contexts
- Secrets management

## Dependencies
- `bitnami/postgresql`: Database (optional)
- `prometheus-community/prometheus`: Monitoring (optional)
- `grafana/grafana`: Dashboards (optional)

See the main [Kubernetes documentation](../../docs/KUBERNETES.md) for detailed deployment instructions.
