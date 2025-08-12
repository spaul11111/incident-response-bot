export interface Incident {
  id: string;
  title: string;
  description?: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  assignee?: string;
  channelId?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  source: 'manual' | 'webhook' | 'monitoring';
  timeline: IncidentEvent[];
  tags: string[];
  metadata?: any;
}

export interface IncidentEvent {
  id: string;
  incidentId: string;
  type: 'created' | 'assigned' | 'status_changed' | 'comment' | 'resolved' | 'closed';
  message: string;
  userId?: string;
  timestamp: Date;
  metadata?: any;
}

export interface CreateIncidentRequest {
  title: string;
  description?: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  assignee?: string;
  source?: 'manual' | 'webhook' | 'monitoring';
  tags?: string[];
  metadata?: any;
}

export interface OnCallSchedule {
  teamId: string;
  teamName: string;
  primary: string;
  secondary?: string;
  escalation: string[];
  schedule: {
    timezone: string;
    rotations: RotationSchedule[];
  };
}

export interface RotationSchedule {
  startDate: Date;
  endDate: Date;
  userId: string;
  type: 'primary' | 'secondary' | 'escalation';
}

export class IncidentManager {
  private incidents: Map<string, Incident> = new Map();
  private incidentEvents: Map<string, IncidentEvent[]> = new Map();
  private onCallSchedules: Map<string, OnCallSchedule> = new Map();

  constructor() {
    this.initializeDefaultSchedules();
  }

  private initializeDefaultSchedules(): void {
    // Default on-call schedule for demo purposes
    const defaultSchedule: OnCallSchedule = {
      teamId: 'default',
      teamName: 'Engineering',
      primary: 'U123456789', // Replace with actual user ID
      secondary: 'U987654321',
      escalation: ['U555666777', 'U888999000'],
      schedule: {
        timezone: 'UTC',
        rotations: []
      }
    };
    
    this.onCallSchedules.set('default', defaultSchedule);
  }

  public async createIncident(request: CreateIncidentRequest): Promise<Incident> {
    const id = this.generateIncidentId();
    const now = new Date();

    const incident: Incident = {
      id,
      title: request.title,
      description: request.description,
      severity: request.severity,
      status: 'open',
      assignee: request.assignee,
      createdAt: now,
      updatedAt: now,
      source: request.source || 'manual',
      timeline: [],
      tags: request.tags || [],
      metadata: request.metadata
    };

    // Add creation event
    const creationEvent: IncidentEvent = {
      id: this.generateEventId(),
      incidentId: id,
      type: 'created',
      message: `Incident created: ${incident.title}`,
      timestamp: now,
      metadata: { severity: incident.severity }
    };

    incident.timeline.push(creationEvent);
    this.incidents.set(id, incident);

    console.log(`📝 Created incident ${id}: ${incident.title} (${incident.severity})`);
    return incident;
  }

  public getIncident(id: string): Incident | undefined {
    return this.incidents.get(id);
  }

  public getAllIncidents(): Incident[] {
    return Array.from(this.incidents.values());
  }

  public getOpenIncidents(): Incident[] {
    return this.getAllIncidents().filter(incident => 
      incident.status === 'open' || incident.status === 'investigating'
    );
  }

  public async assignIncident(incidentId: string, assignee: string): Promise<boolean> {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;

    const oldAssignee = incident.assignee;
    incident.assignee = assignee;
    incident.updatedAt = new Date();

    // Add assignment event
    const event: IncidentEvent = {
      id: this.generateEventId(),
      incidentId,
      type: 'assigned',
      message: oldAssignee 
        ? `Incident reassigned from ${oldAssignee} to ${assignee}`
        : `Incident assigned to ${assignee}`,
      timestamp: new Date(),
      metadata: { oldAssignee, newAssignee: assignee }
    };

    incident.timeline.push(event);
    console.log(`👤 Assigned incident ${incidentId} to ${assignee}`);
    return true;
  }

  public async updateIncidentStatus(
    incidentId: string, 
    status: Incident['status'],
    userId?: string
  ): Promise<boolean> {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;

    const oldStatus = incident.status;
    incident.status = status;
    incident.updatedAt = new Date();

    if (status === 'resolved') {
      incident.resolvedAt = new Date();
    } else if (status === 'closed') {
      incident.closedAt = new Date();
    }

    // Add status change event
    const event: IncidentEvent = {
      id: this.generateEventId(),
      incidentId,
      type: 'status_changed',
      message: `Status changed from ${oldStatus} to ${status}`,
      userId,
      timestamp: new Date(),
      metadata: { oldStatus, newStatus: status }
    };

    incident.timeline.push(event);
    console.log(`📊 Updated incident ${incidentId} status: ${oldStatus} → ${status}`);
    return true;
  }

  public async addIncidentComment(
    incidentId: string, 
    message: string, 
    userId: string
  ): Promise<boolean> {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;

    const event: IncidentEvent = {
      id: this.generateEventId(),
      incidentId,
      type: 'comment',
      message,
      userId,
      timestamp: new Date()
    };

    incident.timeline.push(event);
    incident.updatedAt = new Date();
    return true;
  }

  public getIncidentsByAssignee(assignee: string): Incident[] {
    return this.getAllIncidents().filter(incident => incident.assignee === assignee);
  }

  public getIncidentsBySeverity(severity: Incident['severity']): Incident[] {
    return this.getAllIncidents().filter(incident => incident.severity === severity);
  }

  public getIncidentMetrics(): {
    total: number;
    open: number;
    investigating: number;
    resolved: number;
    closed: number;
    bySeverity: Record<string, number>;
    avgResolutionTime: number;
  } {
    const incidents = this.getAllIncidents();
    const resolved = incidents.filter(i => i.resolvedAt);
    
    // Calculate average resolution time in minutes
    const avgResolutionTime = resolved.length > 0 
      ? resolved.reduce((sum, incident) => {
          if (incident.resolvedAt) {
            return sum + (incident.resolvedAt.getTime() - incident.createdAt.getTime());
          }
          return sum;
        }, 0) / resolved.length / (1000 * 60) // Convert to minutes
      : 0;

    return {
      total: incidents.length,
      open: incidents.filter(i => i.status === 'open').length,
      investigating: incidents.filter(i => i.status === 'investigating').length,
      resolved: incidents.filter(i => i.status === 'resolved').length,
      closed: incidents.filter(i => i.status === 'closed').length,
      bySeverity: {
        P0: incidents.filter(i => i.severity === 'P0').length,
        P1: incidents.filter(i => i.severity === 'P1').length,
        P2: incidents.filter(i => i.severity === 'P2').length,
        P3: incidents.filter(i => i.severity === 'P3').length,
      },
      avgResolutionTime
    };
  }

  // On-call management methods
  public getOnCallSchedule(teamId: string = 'default'): OnCallSchedule | undefined {
    return this.onCallSchedules.get(teamId);
  }

  public getCurrentOnCall(teamId: string = 'default'): {
    primary?: string;
    secondary?: string;
    escalation: string[];
  } {
    const schedule = this.onCallSchedules.get(teamId);
    if (!schedule) {
      return { escalation: [] };
    }

    return {
      primary: schedule.primary,
      secondary: schedule.secondary,
      escalation: schedule.escalation
    };
  }

  public updateOnCallSchedule(teamId: string, schedule: Partial<OnCallSchedule>): boolean {
    const existing = this.onCallSchedules.get(teamId);
    if (!existing) return false;

    this.onCallSchedules.set(teamId, { ...existing, ...schedule });
    return true;
  }

  private generateIncidentId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `INC-${timestamp}-${random}`.toUpperCase();
  }

  private generateEventId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 3);
    return `EVT-${timestamp}-${random}`.toUpperCase();
  }
}
