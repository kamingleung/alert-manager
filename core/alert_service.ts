/**
 * Alert service — orchestrates OpenSearch and Prometheus backends,
 * and provides a unified view for the UI.
 */
import {
  Datasource,
  DatasourceService,
  Logger,
  OpenSearchBackend,
  PrometheusBackend,
  OSAlert,
  OSMonitor,
  PromAlert,
  PromRuleGroup,
  UnifiedAlert,
  UnifiedAlertSeverity,
  UnifiedAlertState,
  UnifiedRule,
} from './types';

export class MultiBackendAlertService {
  private osBackend?: OpenSearchBackend;
  private promBackend?: PrometheusBackend;

  constructor(
    private readonly datasourceService: DatasourceService,
    private readonly logger: Logger
  ) {}

  registerOpenSearch(backend: OpenSearchBackend): void {
    this.osBackend = backend;
    this.logger.info('Registered OpenSearch alerting backend');
  }

  registerPrometheus(backend: PrometheusBackend): void {
    this.promBackend = backend;
    this.logger.info('Registered Prometheus alerting backend');
  }

  // =========================================================================
  // OpenSearch pass-through
  // =========================================================================

  async getOSMonitors(dsId: string): Promise<OSMonitor[]> {
    const ds = await this.requireDatasource(dsId, 'opensearch');
    return this.osBackend!.getMonitors(ds);
  }

  async getOSMonitor(dsId: string, monitorId: string): Promise<OSMonitor | null> {
    const ds = await this.requireDatasource(dsId, 'opensearch');
    return this.osBackend!.getMonitor(ds, monitorId);
  }

  async createOSMonitor(dsId: string, monitor: Omit<OSMonitor, 'id'>): Promise<OSMonitor> {
    const ds = await this.requireDatasource(dsId, 'opensearch');
    return this.osBackend!.createMonitor(ds, monitor);
  }

  async updateOSMonitor(dsId: string, monitorId: string, input: Partial<OSMonitor>): Promise<OSMonitor | null> {
    const ds = await this.requireDatasource(dsId, 'opensearch');
    return this.osBackend!.updateMonitor(ds, monitorId, input);
  }

  async deleteOSMonitor(dsId: string, monitorId: string): Promise<boolean> {
    const ds = await this.requireDatasource(dsId, 'opensearch');
    return this.osBackend!.deleteMonitor(ds, monitorId);
  }

  async getOSAlerts(dsId: string): Promise<{ alerts: OSAlert[]; totalAlerts: number }> {
    const ds = await this.requireDatasource(dsId, 'opensearch');
    return this.osBackend!.getAlerts(ds);
  }

  async acknowledgeOSAlerts(dsId: string, monitorId: string, alertIds: string[]): Promise<any> {
    const ds = await this.requireDatasource(dsId, 'opensearch');
    return this.osBackend!.acknowledgeAlerts(ds, monitorId, alertIds);
  }

  // =========================================================================
  // Prometheus pass-through
  // =========================================================================

  async getPromRuleGroups(dsId: string): Promise<PromRuleGroup[]> {
    const ds = await this.requireDatasource(dsId, 'prometheus');
    return this.promBackend!.getRuleGroups(ds);
  }

  async getPromAlerts(dsId: string): Promise<PromAlert[]> {
    const ds = await this.requireDatasource(dsId, 'prometheus');
    return this.promBackend!.getAlerts(ds);
  }

  // =========================================================================
  // Unified views (for the UI)
  // =========================================================================

  async getUnifiedAlerts(): Promise<UnifiedAlert[]> {
    const datasources = await this.datasourceService.list();
    const enabled = datasources.filter(ds => ds.enabled);
    const results: UnifiedAlert[] = [];

    for (const ds of enabled) {
      try {
        if (ds.type === 'opensearch' && this.osBackend) {
          const { alerts } = await this.osBackend.getAlerts(ds);
          for (const a of alerts) {
            results.push(osAlertToUnified(a, ds.id));
          }
        } else if (ds.type === 'prometheus' && this.promBackend) {
          const alerts = await this.promBackend.getAlerts(ds);
          for (const a of alerts) {
            results.push(promAlertToUnified(a, ds.id));
          }
        }
      } catch (err) {
        this.logger.error(`Failed to get alerts from ${ds.name}: ${err}`);
      }
    }

    return results;
  }

  async getUnifiedRules(): Promise<UnifiedRule[]> {
    const datasources = await this.datasourceService.list();
    const enabled = datasources.filter(ds => ds.enabled);
    const results: UnifiedRule[] = [];

    for (const ds of enabled) {
      try {
        if (ds.type === 'opensearch' && this.osBackend) {
          const monitors = await this.osBackend.getMonitors(ds);
          for (const m of monitors) {
            results.push(osMonitorToUnifiedRule(m, ds.id));
          }
        } else if (ds.type === 'prometheus' && this.promBackend) {
          const groups = await this.promBackend.getRuleGroups(ds);
          for (const g of groups) {
            for (const r of g.rules) {
              if (r.type === 'alerting') {
                results.push(promRuleToUnified(r, g.name, ds.id));
              }
            }
          }
        }
      } catch (err) {
        this.logger.error(`Failed to get rules from ${ds.name}: ${err}`);
      }
    }

    return results;
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private async requireDatasource(dsId: string, expectedType: string): Promise<Datasource> {
    const ds = await this.datasourceService.get(dsId);
    if (!ds) throw new Error(`Datasource not found: ${dsId}`);
    if (ds.type !== expectedType) throw new Error(`Datasource ${dsId} is ${ds.type}, expected ${expectedType}`);
    if (expectedType === 'opensearch' && !this.osBackend) throw new Error('No OpenSearch backend registered');
    if (expectedType === 'prometheus' && !this.promBackend) throw new Error('No Prometheus backend registered');
    return ds;
  }
}

// ============================================================================
// Mapping helpers
// ============================================================================

function osSeverityToUnified(sev: string): UnifiedAlertSeverity {
  switch (sev) {
    case '1': return 'critical';
    case '2': return 'high';
    case '3': return 'medium';
    case '4': return 'low';
    default: return 'info';
  }
}

function osStateToUnified(state: string): UnifiedAlertState {
  switch (state) {
    case 'ACTIVE': return 'active';
    case 'ACKNOWLEDGED': return 'acknowledged';
    case 'COMPLETED': return 'resolved';
    case 'ERROR': return 'error';
    default: return 'active';
  }
}

function promSeverityFromLabels(labels: Record<string, string>): UnifiedAlertSeverity {
  const sev = labels.severity || '';
  if (sev === 'critical' || sev === 'high' || sev === 'medium' || sev === 'low') return sev;
  if (sev === 'warning') return 'medium';
  if (sev === 'page') return 'critical';
  return 'info';
}

function promStateToUnified(state: string): UnifiedAlertState {
  if (state === 'firing') return 'active';
  if (state === 'pending') return 'pending';
  return 'resolved';
}

function osAlertToUnified(a: OSAlert, dsId: string): UnifiedAlert {
  return {
    id: a.id,
    datasourceId: dsId,
    datasourceType: 'opensearch',
    name: `${a.monitor_name} — ${a.trigger_name}`,
    state: osStateToUnified(a.state),
    severity: osSeverityToUnified(a.severity),
    message: a.error_message || undefined,
    startTime: new Date(a.start_time).toISOString(),
    lastUpdated: new Date(a.last_notification_time).toISOString(),
    labels: { monitor_id: a.monitor_id, trigger_id: a.trigger_id },
    annotations: {},
    raw: a,
  };
}

function promAlertToUnified(a: PromAlert, dsId: string): UnifiedAlert {
  return {
    id: `${dsId}-${a.labels.alertname}-${a.labels.instance || ''}`,
    datasourceId: dsId,
    datasourceType: 'prometheus',
    name: a.labels.alertname || 'Unknown',
    state: promStateToUnified(a.state),
    severity: promSeverityFromLabels(a.labels),
    message: a.annotations.summary || a.annotations.description,
    startTime: a.activeAt,
    lastUpdated: a.activeAt,
    labels: a.labels,
    annotations: a.annotations,
    raw: a,
  };
}

function osMonitorToUnifiedRule(m: OSMonitor, dsId: string): UnifiedRule {
  const trigger = m.triggers[0];
  return {
    id: m.id,
    datasourceId: dsId,
    datasourceType: 'opensearch',
    name: m.name,
    enabled: m.enabled,
    severity: trigger ? osSeverityToUnified(trigger.severity) : 'info',
    query: JSON.stringify(m.inputs[0]?.search?.query ?? {}),
    condition: trigger?.condition?.script?.source ?? '',
    labels: {},
    annotations: {},
    raw: m,
  };
}

function promRuleToUnified(r: any, groupName: string, dsId: string): UnifiedRule {
  return {
    id: `${dsId}-${groupName}-${r.name}`,
    datasourceId: dsId,
    datasourceType: 'prometheus',
    name: r.name,
    enabled: true, // Prometheus rules are always enabled if loaded
    severity: promSeverityFromLabels(r.labels),
    query: r.query,
    condition: `> threshold for ${r.duration}s`,
    group: groupName,
    labels: r.labels,
    annotations: r.annotations,
    raw: r,
  };
}
