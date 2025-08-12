import { IncidentManager } from './services/incidentManager';
import { MetricsCollector } from './services/metricsCollector';

console.log('🧪 Testing Incident Response Bot Components...\n');

async function testComponents() {
  // Test IncidentManager
  console.log('📋 Testing IncidentManager...');
  const incidentManager = new IncidentManager();
  
  // Create test incidents
  const incident1 = await incidentManager.createIncident({
    title: 'Database connection timeout',
    severity: 'P1',
    source: 'manual',
    tags: ['database', 'timeout']
  });
  console.log(`✅ Created incident: ${incident1.id}`);

  const incident2 = await incidentManager.createIncident({
    title: 'High CPU usage on web servers',
    severity: 'P2',
    source: 'monitoring',
    tags: ['performance', 'cpu']
  });
  console.log(`✅ Created incident: ${incident2.id}`);

  // Test assignment
  await incidentManager.assignIncident(incident1.id, 'U123456789');
  console.log(`👤 Assigned incident ${incident1.id}`);

  // Test status update
  await incidentManager.updateIncidentStatus(incident2.id, 'investigating');
  console.log(`📊 Updated incident ${incident2.id} status`);

  // Test resolution
  await incidentManager.updateIncidentStatus(incident1.id, 'resolved');
  console.log(`✅ Resolved incident ${incident1.id}`);

  // Test metrics
  const metrics = incidentManager.getIncidentMetrics();
  console.log('📊 Incident Metrics:', {
    total: metrics.total,
    open: metrics.open,
    resolved: metrics.resolved,
    avgResolutionTime: `${metrics.avgResolutionTime.toFixed(2)} minutes`
  });

  // Test on-call
  const onCall = incidentManager.getCurrentOnCall();
  console.log('👥 Current on-call:', onCall);

  console.log('\\n📊 Testing MetricsCollector...');
  const metricsCollector = new MetricsCollector();
  
  // Record some test metrics
  metricsCollector.recordIncidentCreated('P1', 'manual');
  metricsCollector.recordIncidentCreated('P2', 'webhook');
  metricsCollector.recordSlackCommand('incident', true);
  metricsCollector.recordWebhookRequest('prometheus', 200);
  
  // Update metrics with real data
  metricsCollector.updateIncidentStatusMetrics(incidentManager);
  
  // Generate daily metrics
  const dailyMetrics = metricsCollector.generateDailyMetrics(incidentManager);
  console.log('📈 Daily Metrics:', dailyMetrics);

  console.log('\\n✅ All components tested successfully!');
  console.log('\\n📋 Available incidents:');
  incidentManager.getAllIncidents().forEach(inc => {
    console.log(`  • ${inc.id}: ${inc.title} (${inc.severity}) - ${inc.status}`);
  });

  console.log('\\n🚀 Ready to start the bot with real Slack tokens!');
  console.log('💡 Update your .env file with real Slack tokens and run: npm run dev');
}

testComponents().catch(console.error);
