# Setup Guide - Incident Response Bot

## Quick Start

### 1. Prerequisites
- Node.js 18+ installed
- Docker and Docker Compose (for monitoring stack)
- Slack workspace with admin access

### 2. Clone and Install
```bash
git clone <your-repo-url>
cd incident-response-bot
npm install
```

### 3. Slack App Configuration

#### Create Slack App
1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name: "Incident Response Bot"
4. Choose your workspace

#### Configure Bot Permissions
In your Slack app settings:

**OAuth & Permissions → Bot Token Scopes:**
- `app_mentions:read`
- `channels:manage`
- `channels:read`
- `chat:write`
- `commands`
- `users:read`
- `users:read.email`

#### Create Slash Commands
**Slash Commands → Create New Command:**

1. `/incident`
   - Request URL: `https://your-domain.com/slack/events`
   - Description: "Manage incidents"
   - Usage Hint: "create|status|assign|resolve|list"

2. `/oncall`
   - Request URL: `https://your-domain.com/slack/events`
   - Description: "On-call management"
   - Usage Hint: "who|schedule"

3. `/metrics`
   - Request URL: `https://your-domain.com/slack/events`
   - Description: "Show incident metrics"
   - Usage Hint: "today|week"

#### Enable Events
**Event Subscriptions:**
- Request URL: `https://your-domain.com/slack/events`
- Subscribe to bot events:
  - `app_mention`
  - `message.channels`

#### Install to Workspace
1. Go to "Install App"
2. Click "Install to Workspace"
3. Copy the Bot User OAuth Token

### 4. Environment Setup
```bash
cp .env.example .env
```

Edit `.env` with your tokens:
```bash
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token  # Optional for Socket Mode
```

### 5. Development

#### Run Bot Locally
```bash
npm run dev
```

#### Test Components
```bash
npm run test:components
```

### 6. Production Setup

#### Using Docker
```bash
# Build and run everything
docker-compose up -d

# Just monitoring stack
npm run monitoring:up
```

#### Manual Deployment
```bash
npm run build
npm start
```

## Monitoring Setup

### Prometheus (Metrics Collection)
- URL: http://localhost:9090
- Collects bot metrics, incident data, performance stats

### Grafana (Dashboards)
- URL: http://localhost:3001
- Login: admin/admin
- Pre-configured incident response dashboard

### Node Exporter (System Metrics)
- URL: http://localhost:9100
- System-level metrics (CPU, memory, disk)

## Usage Examples

### Creating Incidents
```
/incident create "Database down" P1
/incident create "High latency" P2
```

### Managing Incidents
```
/incident status INC-12345
/incident assign @john.doe
/incident resolve
```

### On-Call Management
```
/oncall who
/oncall who backend-team
```

### Viewing Metrics
```
/metrics today
/metrics week
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Slack App     │◄──►│  Bot Server     │◄──►│   Monitoring    │
│                 │    │                 │    │                 │
│ • Slash Cmds    │    │ • Event Handler │    │ • Prometheus    │
│ • Interactive   │    │ • Incident Mgmt │    │ • Grafana       │
│ • Webhooks      │    │ • Metrics       │    │ • Alertmanager  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Database      │
                       │ (In-Memory)     │
                       └─────────────────┘
```

## Troubleshooting

### Common Issues

**Bot not responding:**
- Check Slack tokens in `.env`
- Verify bot permissions
- Check request URL in Slack app settings

**Metrics not showing:**
- Ensure Prometheus is running
- Check `/metrics` endpoint returns data
- Verify Grafana datasource configuration

**Docker issues:**
- Run `docker-compose logs` to see errors
- Ensure ports 3000, 9090, 3001 are available

### Debug Mode
Set environment variable:
```bash
DEBUG=*
npm run dev
```

## Next Steps

1. **Add Real Database**: Replace in-memory storage with PostgreSQL
2. **External Integrations**: Connect to PagerDuty, DataDog, etc.
3. **Enhanced UI**: Add Slack Block Kit modals and forms
4. **Alerting**: Set up Prometheus alerts and notifications
5. **Authentication**: Add user authentication and RBAC

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## Support

For issues and questions:
- Create an issue in the GitHub repository
- Check the troubleshooting section
- Review Slack API documentation
