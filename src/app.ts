import { App } from '@slack/bolt';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { register } from 'prom-client';
import dotenv from 'dotenv';
import { IncidentManager } from './services/incidentManager';
import { MetricsCollector } from './services/metricsCollector';
import { SlackHandlers } from './handlers/slackHandlers';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

class IncidentResponseBot {
  private app: App;
  private expressApp: express.Application;
  private incidentManager: IncidentManager;
  private metricsCollector: MetricsCollector;
  private slackHandlers: SlackHandlers;
  private port: number;

  constructor() {
    this.port = parseInt(process.env.PORT || '3000', 10);
    
    // Initialize Slack app
    this.app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      socketMode: process.env.SLACK_APP_TOKEN ? true : false,
      appToken: process.env.SLACK_APP_TOKEN,
      port: this.port,
    });

    // Initialize services
    this.incidentManager = new IncidentManager();
    this.metricsCollector = new MetricsCollector();
    
    // Initialize handlers
    this.slackHandlers = new SlackHandlers(
      this.app,
      this.incidentManager,
      this.metricsCollector
    );

    // Initialize Express app for health checks and metrics
    this.expressApp = express();
    this.setupExpressMiddleware();
    this.setupExpressRoutes();
  }

  private setupExpressMiddleware(): void {
    this.expressApp.use(helmet());
    this.expressApp.use(cors());
    this.expressApp.use(express.json());
  }

  private setupExpressRoutes(): void {
    // Health check endpoint
    this.expressApp.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // Metrics endpoint for Prometheus
    this.expressApp.get('/metrics', async (req, res) => {
      try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
      } catch (error) {
        res.status(500).end(error);
      }
    });

    // Webhook endpoint for external alerts
    this.expressApp.post('/webhook/alert', async (req, res) => {
      try {
        const alert = req.body;
        console.log('📥 Received alert:', alert);
        
        // Process the alert and create an incident if needed
        await this.handleIncomingAlert(alert);
        
        res.json({ success: true, message: 'Alert processed' });
      } catch (error) {
        console.error('❌ Error processing alert:', error);
        res.status(500).json({ success: false, error: 'Failed to process alert' });
      }
    });

    // API endpoints for incident management
    this.expressApp.get('/api/incidents', (req, res) => {
      const incidents = this.incidentManager.getAllIncidents();
      res.json(incidents);
    });

    this.expressApp.get('/api/incidents/:id', (req, res) => {
      const incident = this.incidentManager.getIncident(req.params.id);
      if (incident) {
        res.json(incident);
      } else {
        res.status(404).json({ error: 'Incident not found' });
      }
    });
  }

  private async handleIncomingAlert(alert: any): Promise<void> {
    // Extract alert information
    const severity = this.mapAlertSeverity(alert.severity || alert.priority);
    const title = alert.summary || alert.title || 'Unknown Alert';
    const description = alert.description || alert.message || '';

    // Create incident from alert
    const incident = await this.incidentManager.createIncident({
      title,
      description,
      severity,
      source: 'webhook',
      metadata: alert
    });

    console.log(`🚨 Created incident ${incident.id} from alert: ${title}`);
  }

  private mapAlertSeverity(alertSeverity: string): 'P0' | 'P1' | 'P2' | 'P3' {
    const severity = (alertSeverity || '').toLowerCase();
    
    if (['critical', 'p0', 'sev0', 'high'].includes(severity)) return 'P0';
    if (['high', 'p1', 'sev1', 'medium'].includes(severity)) return 'P1';
    if (['medium', 'p2', 'sev2', 'low'].includes(severity)) return 'P2';
    
    return 'P3'; // Default to lowest severity
  }

  public async start(): Promise<void> {
    try {
      // Start Slack app
      await this.app.start();
      console.log('⚡️ Slack app is running!');

      // Start Express server
      this.expressApp.listen(this.port, () => {
        console.log(`🚀 Express server is running on port ${this.port}`);
        console.log(`📊 Metrics available at http://localhost:${this.port}/metrics`);
        console.log(`🏥 Health check at http://localhost:${this.port}/health`);
      });

      // Log startup information
      console.log('🤖 Incident Response Bot started successfully!');
      console.log('📋 Available commands:');
      console.log('   /incident create [title] [severity] - Create new incident');
      console.log('   /incident assign @user - Assign incident');
      console.log('   /incident resolve - Mark as resolved');
      console.log('   /incident status - Show status');
      console.log('   /oncall who [team] - Show on-call person');
      console.log('   /metrics today - Daily metrics');

    } catch (error) {
      console.error('❌ Error starting the bot:', error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    try {
      await this.app.stop();
      console.log('🛑 Bot stopped successfully');
    } catch (error) {
      console.error('❌ Error stopping the bot:', error);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the bot
const bot = new IncidentResponseBot();
bot.start().catch(console.error);

export default IncidentResponseBot;
