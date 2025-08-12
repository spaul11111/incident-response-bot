<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Incident Response Bot - Copilot Instructions

This is a Slack bot for incident response management built with TypeScript, Node.js, and the Slack Bolt framework.

## Project Context

- **Purpose**: DevOps incident response automation and management
- **Architecture**: Event-driven Slack bot with monitoring integration
- **Tech Stack**: TypeScript, Node.js, Slack Bolt, Express, Prometheus, Grafana
- **Database**: In-memory storage (portfolio/demo purposes)
- **Deployment**: Docker containerized with monitoring stack

## Code Guidelines

1. **TypeScript**: Use strict typing, interfaces for data models
2. **Error Handling**: Always wrap async operations in try-catch
3. **Logging**: Use console.log with emoji prefixes for visibility
4. **Metrics**: Record all operations for Prometheus monitoring
5. **Slack Responses**: Use ephemeral vs in_channel appropriately
6. **Documentation**: Comment complex logic and API integrations

## Key Components

- `IncidentManager`: Core business logic for incident CRUD operations
- `MetricsCollector`: Prometheus metrics collection and aggregation
- `SlackHandlers`: Slack command and event processing
- `app.ts`: Main application entry point with Express server

## Slack Integration Patterns

- Use `ack()` immediately for all interactions
- Provide user feedback for long operations
- Use blocks for rich message formatting
- Handle errors gracefully with user-friendly messages
- Record metrics for all commands and events

## Development Focus

This is a portfolio project showcasing:
- Modern TypeScript patterns
- Slack bot development
- DevOps tooling integration
- Monitoring and observability
- Docker containerization
- CI/CD with GitHub Actions

When suggesting improvements, prioritize code quality, error handling, and demonstrating DevOps best practices.
