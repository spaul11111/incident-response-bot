import { Counter, Gauge, Histogram, register } from 'prom-client';
import { IncidentManager } from './incidentManager';

export class MetricsCollector {
  // Incident metrics
  private incidentTotal!: Counter<string>;
  private incidentsByStatus!: Gauge<string>;
  private incidentsBySeverity!: Gauge<string>;
  private incidentResolutionTime!: Histogram<string>;
  private activeIncidents!: Gauge<string>;

  // Bot metrics
  private slackCommandsTotal!: Counter<string>;
  private slackEventsTotal!: Counter<string>;
  private webhookRequestsTotal!: Counter<string>;

  // Response time metrics
  private responseTimeHistogram!: Histogram<string>;

  constructor() {
    this.initializeMetrics();
    this.startMetricsCollection();
  }

  private initializeMetrics(): void {
    // Incident metrics
    this.incidentTotal = new Counter({
      name: 'incidents_total',
      help: 'Total number of incidents created',
      labelNames: ['severity', 'source'],
    });

    this.incidentsByStatus = new Gauge({
      name: 'incidents_by_status',
      help: 'Number of incidents by status',
      labelNames: ['status'],
    });

    this.incidentsBySeverity = new Gauge({
      name: 'incidents_by_severity',
      help: 'Number of incidents by severity',
      labelNames: ['severity'],
    });

    this.incidentResolutionTime = new Histogram({
      name: 'incident_resolution_time_minutes',
      help: 'Time taken to resolve incidents in minutes',
      labelNames: ['severity'],
      buckets: [5, 10, 30, 60, 120, 240, 480, 960, 1440], // 5min to 24h
    });

    this.activeIncidents = new Gauge({
      name: 'active_incidents',
      help: 'Number of currently active incidents',
      labelNames: ['severity'],
    });

    // Bot interaction metrics
    this.slackCommandsTotal = new Counter({
      name: 'slack_commands_total',
      help: 'Total number of Slack commands processed',
      labelNames: ['command', 'success'],
    });

    this.slackEventsTotal = new Counter({
      name: 'slack_events_total',
      help: 'Total number of Slack events processed',
      labelNames: ['event_type', 'success'],
    });

    this.webhookRequestsTotal = new Counter({
      name: 'webhook_requests_total',
      help: 'Total number of webhook requests received',
      labelNames: ['source', 'status'],
    });

    this.responseTimeHistogram = new Histogram({
      name: 'response_time_seconds',
      help: 'Response time for various operations',
      labelNames: ['operation'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
    });

    register.registerMetric(this.incidentTotal);
    register.registerMetric(this.incidentsByStatus);
    register.registerMetric(this.incidentsBySeverity);
    register.registerMetric(this.incidentResolutionTime);
    register.registerMetric(this.activeIncidents);
    register.registerMetric(this.slackCommandsTotal);
    register.registerMetric(this.slackEventsTotal);
    register.registerMetric(this.webhookRequestsTotal);
    register.registerMetric(this.responseTimeHistogram);

    console.log('📊 Prometheus metrics initialized');
  }

  private startMetricsCollection(): void {
    // Update metrics every 30 seconds
    setInterval(() => {
      this.updateSystemMetrics();
    }, 30000);
  }

  private updateSystemMetrics(): void {
    // These would be updated based on real incident data
    // For now, we'll update with demo values
    const timestamp = new Date();
    console.log(`📈 Updating metrics at ${timestamp.toISOString()}`);
  }

  // Incident-related metrics methods
  public recordIncidentCreated(severity: string, source: string): void {
    this.incidentTotal.inc({ severity, source });
    console.log(`📊 Recorded incident created: ${severity} from ${source}`);
  }

  public recordIncidentResolved(severity: string, resolutionTimeMinutes: number): void {
    this.incidentResolutionTime.observe({ severity }, resolutionTimeMinutes);
    console.log(`📊 Recorded incident resolution: ${severity} in ${resolutionTimeMinutes} minutes`);
  }

  public updateIncidentStatusMetrics(incidentManager: IncidentManager): void {
    const metrics = incidentManager.getIncidentMetrics();

    // Update status metrics
    this.incidentsByStatus.set({ status: 'open' }, metrics.open);
    this.incidentsByStatus.set({ status: 'investigating' }, metrics.investigating);
    this.incidentsByStatus.set({ status: 'resolved' }, metrics.resolved);
    this.incidentsByStatus.set({ status: 'closed' }, metrics.closed);

    // Update severity metrics
    this.incidentsBySeverity.set({ severity: 'P0' }, metrics.bySeverity.P0);
    this.incidentsBySeverity.set({ severity: 'P1' }, metrics.bySeverity.P1);
    this.incidentsBySeverity.set({ severity: 'P2' }, metrics.bySeverity.P2);
    this.incidentsBySeverity.set({ severity: 'P3' }, metrics.bySeverity.P3);

    // Update active incidents (open + investigating)
    this.activeIncidents.set({ severity: 'total' }, metrics.open + metrics.investigating);
  }

  // Slack interaction metrics
  public recordSlackCommand(command: string, success: boolean): void {
    this.slackCommandsTotal.inc({ command, success: success.toString() });
  }

  public recordSlackEvent(eventType: string, success: boolean): void {
    this.slackEventsTotal.inc({ event_type: eventType, success: success.toString() });
  }

  public recordWebhookRequest(source: string, status: number): void {
    this.webhookRequestsTotal.inc({ 
      source, 
      status: status >= 200 && status < 300 ? 'success' : 'error' 
    });
  }

  // Performance metrics
  public recordResponseTime(operation: string, timeSeconds: number): void {
    this.responseTimeHistogram.observe({ operation }, timeSeconds);
  }

  public async measureOperation<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = (Date.now() - start) / 1000;
      this.recordResponseTime(operation, duration);
      return result;
    } catch (error) {
      const duration = (Date.now() - start) / 1000;
      this.recordResponseTime(operation, duration);
      throw error;
    }
  }

  // Daily/weekly metrics aggregation
  public generateDailyMetrics(incidentManager: IncidentManager): {
    incidentsCreatedToday: number;
    incidentsResolvedToday: number;
    avgResolutionTimeToday: number;
    criticalIncidentsToday: number;
    activeIncidents: number;
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const allIncidents = incidentManager.getAllIncidents();
    
    const incidentsCreatedToday = allIncidents.filter(
      incident => incident.createdAt >= today
    ).length;

    const incidentsResolvedToday = allIncidents.filter(
      incident => incident.resolvedAt && incident.resolvedAt >= today
    ).length;

    const criticalIncidentsToday = allIncidents.filter(
      incident => incident.createdAt >= today && 
                 (incident.severity === 'P0' || incident.severity === 'P1')
    ).length;

    const resolvedTodayWithTimes = allIncidents.filter(
      incident => incident.resolvedAt && 
                 incident.resolvedAt >= today &&
                 incident.createdAt
    );

    const avgResolutionTimeToday = resolvedTodayWithTimes.length > 0
      ? resolvedTodayWithTimes.reduce((sum, incident) => {
          if (incident.resolvedAt) {
            return sum + (incident.resolvedAt.getTime() - incident.createdAt.getTime());
          }
          return sum;
        }, 0) / resolvedTodayWithTimes.length / (1000 * 60) // Convert to minutes
      : 0;

    const activeIncidents = incidentManager.getOpenIncidents().length;

    return {
      incidentsCreatedToday,
      incidentsResolvedToday,
      avgResolutionTimeToday: Math.round(avgResolutionTimeToday),
      criticalIncidentsToday,
      activeIncidents
    };
  }

  public getMetricsSummary(): string {
    return `
📊 **Incident Response Bot Metrics**

**Incident Counters:**
- Total incidents tracked
- Incidents by status (open, investigating, resolved, closed)
- Incidents by severity (P0, P1, P2, P3)
- Resolution time distribution

**Bot Performance:**
- Slack commands processed
- Webhook requests handled
- Response time metrics

**Available at:** \`/metrics\` endpoint for Prometheus scraping
    `.trim();
  }
}
