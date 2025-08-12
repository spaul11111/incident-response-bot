# 🚨 Incident Response Bot

[![CI/CD Pipeline](https://github.com/username/incident-response-bot/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/username/incident-response-bot/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Slack](https://img.shields.io/badge/Slack-4A154B?style=flat&logo=slack&logoColor=white)](https://slack.com/)

> **A comprehensive Slack bot for DevOps incident response management with real-time monitoring and automation.**

## 🎯 Overview

This project showcases a production-ready Slack bot built for incident response management. It demonstrates modern DevOps practices, real-time monitoring integration, and comprehensive automation workflows - perfect for showcasing full-stack development and DevOps engineering skills.

## ✨ Key Features

### 🚨 **Incident Management**
- **Automated Incident Creation** - Create incidents via Slack commands or external webhooks
- **Smart Channel Management** - Auto-creates dedicated incident channels with proper naming
- **Status Tracking** - Real-time incident status updates with timeline tracking
- **Assignment System** - Assign incidents to team members with notifications

### 👥 **On-Call Management**
- **Rotation Schedules** - Manage primary, secondary, and escalation contacts
- **Team Organization** - Support for multiple teams and schedules
- **Quick Lookup** - Instantly find who's on-call with `/oncall who`

### 📊 **Monitoring & Analytics**
- **Prometheus Integration** - Custom metrics for incident tracking
- **Grafana Dashboards** - Beautiful visualizations and real-time monitoring
- **MTTR Tracking** - Mean Time To Recovery and other key DevOps metrics
- **Performance Monitoring** - Bot performance and response time analytics

### 🔧 **DevOps Integration**
- **Webhook Support** - Receive alerts from monitoring systems
- **CI/CD Pipeline** - Automated testing, security scanning, and deployment
- **Docker Deployment** - Full containerized stack with docker-compose
- **Health Monitoring** - Comprehensive health checks and observability

## 🚀 Features

- **Incident Management**: Create, track, and resolve incidents
- **Slack Integration**: Slash commands, interactive components
- **On-Call Management**: Rotation schedules and escalation
- **Monitoring Integration**: Prometheus metrics and Grafana dashboards
- **Automated Workflows**: Channel creation, notifications, status updates
- **Analytics**: Incident metrics, MTTR tracking, reporting

## 📋 Prerequisites

- Node.js 18+ 
- Slack workspace with admin access
- Docker (optional, for monitoring stack)

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd incident-response-bot
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your Slack tokens
```

4. Build and run:
```bash
npm run build
npm start
```

For development:
```bash
npm run dev
```

## 🔧 Slack App Setup

1. Create a new Slack app at https://api.slack.com/apps
2. Configure Bot Token Scopes:
   - `app_mentions:read`
   - `chat:write`
   - `channels:manage`
   - `channels:read`
   - `commands`
   - `users:read`
3. Install the app to your workspace
4. Copy the tokens to your `.env` file

## 📊 Monitoring Stack

Start the monitoring stack with Docker:
```bash
docker-compose up -d
```

Access:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)

## 🎯 Commands

- `/incident create [title] [severity]` - Create new incident
- `/incident assign @user` - Assign incident
- `/incident resolve` - Mark as resolved
- `/incident status` - Show status
- `/oncall who [team]` - Show on-call person
- `/metrics today` - Daily metrics

## 🏗️ Architecture

```
Slack App ↔ Bot Server ↔ Monitoring APIs
              ↓
           Database
```

## 📈 Metrics

The bot tracks:
- Incident count and trends
- Mean Time To Recovery (MTTR)
- Response time metrics
- Team performance analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License - see LICENSE file for details.
