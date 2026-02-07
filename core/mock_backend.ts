/**
 * Mock alerting backend — simulates both OpenSearch and Prometheus backends
 */
import {
  Alert,
  AlertRule,
  AlertingBackend,
  AlertSeverity,
  AlertState,
  CreateAlertRuleInput,
  Datasource,
  DatasourceType,
  Logger,
  UpdateAlertRuleInput,
} from './types';

// Mock data generators
function randomState(): AlertState {
  const states: AlertState[] = ['OK', 'ALERTING', 'PENDING', 'NO_DATA'];
  return states[Math.floor(Math.random() * states.length)];
}

function randomSeverity(): AlertSeverity {
  const severities: AlertSeverity[] = ['critical', 'high', 'medium', 'low'];
  return severities[Math.floor(Math.random() * severities.length)];
}

export class MockAlertingBackend implements AlertingBackend {
  readonly type: DatasourceType;
  private rules: Map<string, Map<string, AlertRule>> = new Map(); // datasourceId -> ruleId -> rule
  private ruleCounter = 0;

  constructor(
    type: DatasourceType,
    private readonly logger: Logger
  ) {
    this.type = type;
  }

  async getAlerts(datasource: Datasource): Promise<Alert[]> {
    // Generate mock alerts based on rules
    const dsRules = this.rules.get(datasource.id);
    if (!dsRules || dsRules.size === 0) {
      return this.generateMockAlerts(datasource, 3);
    }

    const alerts: Alert[] = [];
    for (const rule of dsRules.values()) {
      if (rule.enabled && Math.random() > 0.5) {
        alerts.push({
          id: `alert-${rule.id}`,
          datasourceId: datasource.id,
          name: rule.name,
          state: randomState(),
          severity: rule.severity,
          message: `Alert triggered by rule: ${rule.name}`,
          labels: { ...rule.labels, alertname: rule.name },
          annotations: rule.annotations,
          startsAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
          updatedAt: new Date().toISOString(),
          fingerprint: `fp-${rule.id}`,
        });
      }
    }
    return alerts;
  }

  private generateMockAlerts(datasource: Datasource, count: number): Alert[] {
    const alerts: Alert[] = [];
    const mockNames = [
      'High CPU Usage',
      'Memory Pressure',
      'Disk Space Low',
      'Network Latency',
      'Error Rate Spike',
      'Request Timeout',
    ];

    for (let i = 0; i < count; i++) {
      const name = mockNames[i % mockNames.length];
      alerts.push({
        id: `mock-alert-${datasource.id}-${i}`,
        datasourceId: datasource.id,
        name,
        state: randomState(),
        severity: randomSeverity(),
        message: `Mock alert: ${name}`,
        labels: {
          alertname: name,
          instance: `server-${i + 1}`,
          job: datasource.type === 'prometheus' ? 'prometheus' : 'opensearch',
        },
        annotations: {
          summary: `${name} detected`,
          description: `This is a mock alert for testing purposes`,
        },
        startsAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        updatedAt: new Date().toISOString(),
        fingerprint: `mock-fp-${i}`,
      });
    }
    return alerts;
  }

  async getRules(datasource: Datasource): Promise<AlertRule[]> {
    const dsRules = this.rules.get(datasource.id);
    if (!dsRules) return [];
    return Array.from(dsRules.values());
  }

  async getRule(datasource: Datasource, ruleId: string): Promise<AlertRule | null> {
    const dsRules = this.rules.get(datasource.id);
    if (!dsRules) return null;
    return dsRules.get(ruleId) ?? null;
  }

  async createRule(datasource: Datasource, input: CreateAlertRuleInput): Promise<AlertRule> {
    const ruleId = `rule-${++this.ruleCounter}`;
    const now = new Date().toISOString();
    
    const rule: AlertRule = {
      id: ruleId,
      datasourceId: datasource.id,
      name: input.name,
      enabled: input.enabled ?? true,
      severity: input.severity,
      query: input.query,
      condition: input.condition,
      duration: input.duration,
      labels: input.labels ?? {},
      annotations: input.annotations ?? {},
      createdAt: now,
      updatedAt: now,
    };

    if (!this.rules.has(datasource.id)) {
      this.rules.set(datasource.id, new Map());
    }
    this.rules.get(datasource.id)!.set(ruleId, rule);
    
    this.logger.info(`Created rule ${ruleId} for datasource ${datasource.id}`);
    return rule;
  }

  async updateRule(
    datasource: Datasource,
    ruleId: string,
    input: UpdateAlertRuleInput
  ): Promise<AlertRule | null> {
    const dsRules = this.rules.get(datasource.id);
    if (!dsRules) return null;
    
    const rule = dsRules.get(ruleId);
    if (!rule) return null;

    Object.assign(rule, input, { updatedAt: new Date().toISOString() });
    this.logger.info(`Updated rule ${ruleId}`);
    return rule;
  }

  async deleteRule(datasource: Datasource, ruleId: string): Promise<boolean> {
    const dsRules = this.rules.get(datasource.id);
    if (!dsRules) return false;
    
    const deleted = dsRules.delete(ruleId);
    if (deleted) this.logger.info(`Deleted rule ${ruleId}`);
    return deleted;
  }

  async toggleRule(datasource: Datasource, ruleId: string): Promise<AlertRule | null> {
    const dsRules = this.rules.get(datasource.id);
    if (!dsRules) return null;
    
    const rule = dsRules.get(ruleId);
    if (!rule) return null;

    rule.enabled = !rule.enabled;
    rule.updatedAt = new Date().toISOString();
    this.logger.info(`Toggled rule ${ruleId}: enabled=${rule.enabled}`);
    return rule;
  }

  // Seed mock rules for a datasource
  seedRules(datasourceId: string, rules: Omit<AlertRule, 'id' | 'datasourceId' | 'createdAt' | 'updatedAt'>[]): void {
    if (!this.rules.has(datasourceId)) {
      this.rules.set(datasourceId, new Map());
    }
    const dsRules = this.rules.get(datasourceId)!;
    const now = new Date().toISOString();

    for (const r of rules) {
      const ruleId = `rule-${++this.ruleCounter}`;
      dsRules.set(ruleId, {
        ...r,
        id: ruleId,
        datasourceId,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}
