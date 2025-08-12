import { App, SlashCommand, ButtonAction, BlockAction } from '@slack/bolt';
import { IncidentManager, Incident } from '../services/incidentManager';
import { MetricsCollector } from '../services/metricsCollector';

export class SlackHandlers {
  constructor(
    private app: App,
    private incidentManager: IncidentManager,
    private metricsCollector: MetricsCollector
  ) {
    this.setupCommands();
    this.setupEvents();
    this.setupInteractions();
  }

  private setupCommands(): void {
    // Main incident command with subcommands
    this.app.command('/incident', async ({ command, ack, respond, client }) => {
      await ack();

      const startTime = Date.now();
      let success = true;

      try {
        const args = command.text.trim().split(' ');
        const subcommand = args[0]?.toLowerCase();

        switch (subcommand) {
          case 'create':
            await this.handleCreateIncident(args.slice(1), respond, client, command.user_id, command.channel_id);
            break;
          case 'status':
            await this.handleStatusCommand(args.slice(1), respond);
            break;
          case 'assign':
            await this.handleAssignCommand(args.slice(1), respond, command.channel_id);
            break;
          case 'resolve':
            await this.handleResolveCommand(respond, command.channel_id, command.user_id);
            break;
          case 'list':
            await this.handleListCommand(args.slice(1), respond);
            break;
          default:
            await this.showIncidentHelp(respond);
        }
      } catch (error) {
        success = false;
        console.error('❌ Error handling /incident command:', error);
        await respond({
          text: '❌ An error occurred while processing your command. Please try again.',
          response_type: 'ephemeral'
        });
      } finally {
        const duration = (Date.now() - startTime) / 1000;
        this.metricsCollector.recordSlackCommand('incident', success);
        this.metricsCollector.recordResponseTime('incident_command', duration);
      }
    });

    // On-call management command
    this.app.command('/oncall', async ({ command, ack, respond }) => {
      await ack();

      try {
        const args = command.text.trim().split(' ');
        const subcommand = args[0]?.toLowerCase();

        switch (subcommand) {
          case 'who':
            await this.handleOnCallWho(args.slice(1), respond);
            break;
          case 'schedule':
            await this.handleOnCallSchedule(respond);
            break;
          default:
            await this.showOnCallHelp(respond);
        }
      } catch (error) {
        console.error('❌ Error handling /oncall command:', error);
        await respond({
          text: '❌ An error occurred while processing your command.',
          response_type: 'ephemeral'
        });
      }

      this.metricsCollector.recordSlackCommand('oncall', true);
    });

    // Metrics command
    this.app.command('/metrics', async ({ command, ack, respond }) => {
      await ack();

      try {
        const args = command.text.trim().split(' ');
        const period = args[0]?.toLowerCase() || 'today';

        await this.handleMetricsCommand(period, respond);
      } catch (error) {
        console.error('❌ Error handling /metrics command:', error);
        await respond({
          text: '❌ An error occurred while fetching metrics.',
          response_type: 'ephemeral'
        });
      }

      this.metricsCollector.recordSlackCommand('metrics', true);
    });
  }

  private setupEvents(): void {
    // Listen for channel messages to track incident updates
    this.app.message(async ({ message, client }) => {
      try {
        // Only process messages in incident channels
        if ('channel' in message && message.channel?.startsWith('C')) {
          // Check if this is an incident channel by pattern matching
          const channelInfo = await client.conversations.info({
            channel: message.channel
          });

          if (channelInfo.channel?.name?.startsWith('incident-')) {
            // This is an incident channel, could track activity here
            console.log(`💬 Activity in incident channel: ${channelInfo.channel.name}`);
          }
        }
      } catch (error) {
        console.error('❌ Error processing message event:', error);
      }

      this.metricsCollector.recordSlackEvent('message', true);
    });

    // Listen for app mentions
    this.app.event('app_mention', async ({ event, client, say }) => {
      try {
        await say({
          text: `👋 Hi <@${event.user}>! I'm the Incident Response Bot. Use \`/incident help\` to see available commands.`
        });
      } catch (error) {
        console.error('❌ Error handling app mention:', error);
      }

      this.metricsCollector.recordSlackEvent('app_mention', true);
    });
  }

  private setupInteractions(): void {
    // Handle button interactions
    this.app.action('resolve_incident', async ({ ack, body, client }) => {
      await ack();

      try {
        if ('actions' in body && body.actions && body.actions.length > 0) {
          const action = body.actions[0];
          const incidentId = 'value' in action ? action.value : undefined;

          if (incidentId) {
            const success = await this.incidentManager.updateIncidentStatus(
              incidentId, 
              'resolved', 
              body.user.id
            );

            if (success) {
              const incident = this.incidentManager.getIncident(incidentId);
              if (incident && 'channel' in body && body.channel) {
                await client.chat.postMessage({
                  channel: body.channel.id,
                  text: `✅ Incident ${incidentId} has been resolved by <@${body.user.id}>`,
                  blocks: this.buildIncidentStatusBlocks(incident)
                });

                // Record resolution time
                if (incident.resolvedAt) {
                  const resolutionTime = (incident.resolvedAt.getTime() - incident.createdAt.getTime()) / (1000 * 60);
                  this.metricsCollector.recordIncidentResolved(incident.severity, resolutionTime);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Error resolving incident:', error);
      }
    });

    // Handle severity selection
    this.app.action(/^severity_/, async ({ ack, body, action }) => {
      await ack();
      
      try {
        if ('action_id' in action) {
          console.log(`📊 Severity selected: ${action.action_id}`);
          // Handle severity selection logic here
        }
      } catch (error) {
        console.error('❌ Error handling severity selection:', error);
      }
    });
  }

  private async handleCreateIncident(
    args: string[], 
    respond: any, 
    client: any, 
    userId: string, 
    channelId: string
  ): Promise<void> {
    if (args.length < 2) {
      await respond({
        text: '❌ Usage: `/incident create <title> <severity>`\\nExample: `/incident create "Database down" P1`',
        response_type: 'ephemeral'
      });
      return;
    }

    const title = args.slice(0, -1).join(' ').replace(/"/g, '');
    const severity = args[args.length - 1].toUpperCase() as 'P0' | 'P1' | 'P2' | 'P3';

    if (!['P0', 'P1', 'P2', 'P3'].includes(severity)) {
      await respond({
        text: '❌ Invalid severity. Use P0, P1, P2, or P3.',
        response_type: 'ephemeral'
      });
      return;
    }

    try {
      const incident = await this.incidentManager.createIncident({
        title,
        severity,
        assignee: userId,
        source: 'manual'
      });

      // Create incident channel
      const channelName = `incident-${incident.id.toLowerCase()}`;
      const incidentChannel = await client.conversations.create({
        name: channelName,
        is_private: false
      });

      // Update incident with channel ID
      incident.channelId = incidentChannel.channel.id;

      // Invite relevant users to the channel
      const onCallInfo = this.incidentManager.getCurrentOnCall();
      const usersToInvite = [userId];
      if (onCallInfo.primary) usersToInvite.push(onCallInfo.primary);
      if (onCallInfo.secondary) usersToInvite.push(onCallInfo.secondary);

      for (const user of usersToInvite) {
        try {
          await client.conversations.invite({
            channel: incidentChannel.channel.id,
            users: user
          });
        } catch (error) {
          console.error(`Failed to invite user ${user}:`, error);
        }
      }

      // Post initial incident message
      await client.chat.postMessage({
        channel: incidentChannel.channel.id,
        blocks: this.buildIncidentBlocks(incident)
      });

      // Record metrics
      this.metricsCollector.recordIncidentCreated(severity, 'manual');
      this.metricsCollector.updateIncidentStatusMetrics(this.incidentManager);

      await respond({
        text: `✅ Incident ${incident.id} created successfully! Check <#${incidentChannel.channel.id}>`,
        response_type: 'in_channel'
      });

    } catch (error) {
      console.error('❌ Error creating incident:', error);
      await respond({
        text: '❌ Failed to create incident. Please try again.',
        response_type: 'ephemeral'
      });
    }
  }

  private async handleStatusCommand(args: string[], respond: any): Promise<void> {
    const incidentId = args[0];
    
    if (!incidentId) {
      // Show overall status
      const metrics = this.incidentManager.getIncidentMetrics();
      await respond({
        text: `📊 **Incident Status Overview**\\n\\n` +
              `🔴 Open: ${metrics.open}\\n` +
              `🟡 Investigating: ${metrics.investigating}\\n` +
              `🟢 Resolved: ${metrics.resolved}\\n` +
              `⚫ Closed: ${metrics.closed}\\n\\n` +
              `**By Severity:**\\n` +
              `P0: ${metrics.bySeverity.P0} | P1: ${metrics.bySeverity.P1} | P2: ${metrics.bySeverity.P2} | P3: ${metrics.bySeverity.P3}\\n\\n` +
              `⏱️ Avg Resolution Time: ${Math.round(metrics.avgResolutionTime)} minutes`,
        response_type: 'ephemeral'
      });
    } else {
      // Show specific incident status
      const incident = this.incidentManager.getIncident(incidentId);
      if (incident) {
        await respond({
          blocks: this.buildIncidentStatusBlocks(incident),
          response_type: 'ephemeral'
        });
      } else {
        await respond({
          text: `❌ Incident ${incidentId} not found.`,
          response_type: 'ephemeral'
        });
      }
    }
  }

  private async handleAssignCommand(args: string[], respond: any, channelId: string): Promise<void> {
    if (args.length === 0) {
      await respond({
        text: '❌ Usage: `/incident assign @username`',
        response_type: 'ephemeral'
      });
      return;
    }

    // Extract user ID from mention
    const userMention = args[0];
    const userIdMatch = userMention.match(/<@([A-Z0-9]+)>/);
    
    if (!userIdMatch) {
      await respond({
        text: '❌ Please mention a valid user with @username',
        response_type: 'ephemeral'
      });
      return;
    }

    const userId = userIdMatch[1];
    
    // Find incident associated with this channel
    const openIncidents = this.incidentManager.getOpenIncidents();
    const incident = openIncidents.find(inc => inc.channelId === channelId);

    if (!incident) {
      await respond({
        text: '❌ No active incident found in this channel.',
        response_type: 'ephemeral'
      });
      return;
    }

    const success = await this.incidentManager.assignIncident(incident.id, userId);
    if (success) {
      await respond({
        text: `✅ Incident ${incident.id} assigned to <@${userId}>`,
        response_type: 'in_channel'
      });
    } else {
      await respond({
        text: '❌ Failed to assign incident.',
        response_type: 'ephemeral'
      });
    }
  }

  private async handleResolveCommand(respond: any, channelId: string, userId: string): Promise<void> {
    // Find incident associated with this channel
    const openIncidents = this.incidentManager.getOpenIncidents();
    const incident = openIncidents.find(inc => inc.channelId === channelId);

    if (!incident) {
      await respond({
        text: '❌ No active incident found in this channel.',
        response_type: 'ephemeral'
      });
      return;
    }

    const success = await this.incidentManager.updateIncidentStatus(incident.id, 'resolved', userId);
    if (success) {
      const updatedIncident = this.incidentManager.getIncident(incident.id);
      if (updatedIncident?.resolvedAt) {
        const resolutionTime = (updatedIncident.resolvedAt.getTime() - updatedIncident.createdAt.getTime()) / (1000 * 60);
        this.metricsCollector.recordIncidentResolved(updatedIncident.severity, resolutionTime);
      }

      await respond({
        text: `✅ Incident ${incident.id} has been resolved!`,
        blocks: this.buildIncidentStatusBlocks(incident),
        response_type: 'in_channel'
      });
    } else {
      await respond({
        text: '❌ Failed to resolve incident.',
        response_type: 'ephemeral'
      });
    }
  }

  private async handleListCommand(args: string[], respond: any): Promise<void> {
    const filter = args[0]?.toLowerCase();
    let incidents: Incident[];

    switch (filter) {
      case 'open':
        incidents = this.incidentManager.getOpenIncidents();
        break;
      case 'resolved':
        incidents = this.incidentManager.getAllIncidents().filter(i => i.status === 'resolved');
        break;
      default:
        incidents = this.incidentManager.getOpenIncidents();
    }

    if (incidents.length === 0) {
      await respond({
        text: `📋 No ${filter || 'open'} incidents found.`,
        response_type: 'ephemeral'
      });
      return;
    }

    const incidentList = incidents.slice(0, 10).map(incident => 
      `• ${incident.id} - ${incident.title} (${incident.severity}) - ${incident.status}`
    ).join('\\n');

    await respond({
      text: `📋 **${filter || 'Open'} Incidents:**\\n\\n${incidentList}${incidents.length > 10 ? '\\n\\n_...and more_' : ''}`,
      response_type: 'ephemeral'
    });
  }

  private async handleOnCallWho(args: string[], respond: any): Promise<void> {
    const team = args[0] || 'default';
    const onCallInfo = this.incidentManager.getCurrentOnCall(team);

    await respond({
      text: `👥 **On-Call Information (${team})**\\n\\n` +
            `🔴 Primary: ${onCallInfo.primary ? `<@${onCallInfo.primary}>` : 'Not assigned'}\\n` +
            `🟡 Secondary: ${onCallInfo.secondary ? `<@${onCallInfo.secondary}>` : 'Not assigned'}\\n` +
            `📞 Escalation: ${onCallInfo.escalation.map(u => `<@${u}>`).join(', ') || 'None'}`,
      response_type: 'ephemeral'
    });
  }

  private async handleOnCallSchedule(respond: any): Promise<void> {
    await respond({
      text: `📅 **On-Call Schedule**\\n\\nSchedule management is coming soon! For now, use \`/oncall who\` to see current assignments.`,
      response_type: 'ephemeral'
    });
  }

  private async handleMetricsCommand(period: string, respond: any): Promise<void> {
    const dailyMetrics = this.metricsCollector.generateDailyMetrics(this.incidentManager);

    await respond({
      text: `📊 **Metrics (${period})**\\n\\n` +
            `📈 Incidents Created: ${dailyMetrics.incidentsCreatedToday}\\n` +
            `✅ Incidents Resolved: ${dailyMetrics.incidentsResolvedToday}\\n` +
            `⏱️ Avg Resolution Time: ${dailyMetrics.avgResolutionTimeToday} minutes\\n` +
            `🚨 Critical Incidents: ${dailyMetrics.criticalIncidentsToday}\\n` +
            `🔴 Currently Active: ${dailyMetrics.activeIncidents}\\n\\n` +
            `📊 Full metrics at: \`/metrics\` endpoint`,
      response_type: 'ephemeral'
    });
  }

  private async showIncidentHelp(respond: any): Promise<void> {
    await respond({
      text: `🤖 **Incident Bot Commands**\\n\\n` +
            `\`/incident create <title> <P0|P1|P2|P3>\` - Create new incident\\n` +
            `\`/incident assign @user\` - Assign incident to user\\n` +
            `\`/incident resolve\` - Mark incident as resolved\\n` +
            `\`/incident status [id]\` - Show incident status\\n` +
            `\`/incident list [open|resolved]\` - List incidents\\n\\n` +
            `**Other Commands:**\\n` +
            `\`/oncall who [team]\` - Show on-call person\\n` +
            `\`/metrics [today|week]\` - Show metrics`,
      response_type: 'ephemeral'
    });
  }

  private async showOnCallHelp(respond: any): Promise<void> {
    await respond({
      text: `👥 **On-Call Commands**\\n\\n` +
            `\`/oncall who [team]\` - Show current on-call person\\n` +
            `\`/oncall schedule\` - View rotation schedule`,
      response_type: 'ephemeral'
    });
  }

  private buildIncidentBlocks(incident: Incident): any[] {
    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🚨 Incident ${incident.id}`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Title:*\\n${incident.title}`
          },
          {
            type: 'mrkdwn',
            text: `*Severity:*\\n${incident.severity}`
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\\n${incident.status}`
          },
          {
            type: 'mrkdwn',
            text: `*Assignee:*\\n${incident.assignee ? `<@${incident.assignee}>` : 'Unassigned'}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Created:* ${incident.createdAt.toLocaleString()}`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✅ Resolve'
            },
            style: 'primary',
            action_id: 'resolve_incident',
            value: incident.id
          }
        ]
      }
    ];
  }

  private buildIncidentStatusBlocks(incident: Incident): any[] {
    const statusEmoji = {
      open: '🔴',
      investigating: '🟡',
      resolved: '✅',
      closed: '⚫'
    };

    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji[incident.status]} Incident ${incident.id} - ${incident.status.toUpperCase()}`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Title:*\\n${incident.title}`
          },
          {
            type: 'mrkdwn',
            text: `*Severity:*\\n${incident.severity}`
          },
          {
            type: 'mrkdwn',
            text: `*Assignee:*\\n${incident.assignee ? `<@${incident.assignee}>` : 'Unassigned'}`
          },
          {
            type: 'mrkdwn',
            text: `*Created:*\\n${incident.createdAt.toLocaleString()}`
          }
        ]
      },
      ...(incident.resolvedAt ? [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Resolved:* ${incident.resolvedAt.toLocaleString()}\\n*Resolution Time:* ${Math.round((incident.resolvedAt.getTime() - incident.createdAt.getTime()) / (1000 * 60))} minutes`
        }
      }] : [])
    ];
  }
}
