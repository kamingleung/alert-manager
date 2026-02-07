/**
 * Mock backends — simulate real OpenSearch Alerting and Prometheus API responses.
 */
import {
  Datasource,
  Logger,
  OpenSearchBackend,
  PrometheusBackend,
  OSMonitor,
  OSAlert,
  OSAlertState,
  OSDestination,
  OSTrigger,
  PromAlert,
  PromAlertState,
  PromAlertingRule,
  PromRuleGroup,
  PromRuleHealth,
} from './types';

let idCounter = 100;
const nextId = () => `mock-${++idCounter}`;

// ============================================================================
// Mock OpenSearch Alerting Backend
// ============================================================================

export class MockOpenSearchBackend implements OpenSearchBackend {
  readonly type = 'opensearch' as const;
  private monitors: Map<string, Map<string, OSMonitor>> = new Map(); // dsId -> monitorId -> monitor
  private alerts: Map<string, OSAlert[]> = new Map(); // dsId -> alerts
  private destinations: Map<string, Map<string, OSDestination>> = new Map();

  constructor(private readonly logger: Logger) {}

  // --- Monitors ---

  async getMonitors(ds: Datasource): Promise<OSMonitor[]> {
    return Array.from(this.monitors.get(ds.id)?.values() ?? []);
  }

  async getMonitor(ds: Datasource, monitorId: string): Promise<OSMonitor | null> {
    return this.monitors.get(ds.id)?.get(monitorId) ?? null;
  }

  async createMonitor(ds: Datasource, input: Omit<OSMonitor, 'id'>): Promise<OSMonitor> {
    const id = nextId();
    const monitor: OSMonitor = { ...input, id };
    if (!this.monitors.has(ds.id)) this.monitors.set(ds.id, new Map());
    this.monitors.get(ds.id)!.set(id, monitor);
    this.logger.info(`[OS Mock] Created monitor ${id} for ${ds.id}`);
    return monitor;
  }

  async updateMonitor(ds: Datasource, monitorId: string, input: Partial<OSMonitor>): Promise<OSMonitor | null> {
    const m = this.monitors.get(ds.id)?.get(monitorId);
    if (!m) return null;
    Object.assign(m, input, { last_update_time: Date.now() });
    return m;
  }

  async deleteMonitor(ds: Datasource, monitorId: string): Promise<boolean> {
    return this.monitors.get(ds.id)?.delete(monitorId) ?? false;
  }

  async runMonitor(_ds: Datasource, _monitorId: string, _dryRun?: boolean): Promise<any> {
    return { ok: true };
  }

  // --- Alerts ---

  async getAlerts(ds: Datasource): Promise<{ alerts: OSAlert[]; totalAlerts: number }> {
    const alerts = this.alerts.get(ds.id) ?? [];
    return { alerts, totalAlerts: alerts.length };
  }

  async acknowledgeAlerts(ds: Datasource, _monitorId: string, alertIds: string[]): Promise<any> {
    const alerts = this.alerts.get(ds.id) ?? [];
    for (const a of alerts) {
      if (alertIds.includes(a.id)) {
        a.state = 'ACKNOWLEDGED';
        a.acknowledged_time = Date.now();
      }
    }
    return { success: true };
  }

  // --- Destinations ---

  async getDestinations(ds: Datasource): Promise<OSDestination[]> {
    return Array.from(this.destinations.get(ds.id)?.values() ?? []);
  }

  async createDestination(ds: Datasource, input: Omit<OSDestination, 'id'>): Promise<OSDestination> {
    const id = nextId();
    const dest: OSDestination = { ...input, id };
    if (!this.destinations.has(ds.id)) this.destinations.set(ds.id, new Map());
    this.destinations.get(ds.id)!.set(id, dest);
    return dest;
  }

  async deleteDestination(ds: Datasource, destId: string): Promise<boolean> {
    return this.destinations.get(ds.id)?.delete(destId) ?? false;
  }

  // --- Seeding ---

  seed(dsId: string): void {
    const now = Date.now();
    const fiveMinAgo = now - 5 * 60_000;
    const oneHourAgo = now - 60 * 60_000;

    // Destinations
    if (!this.destinations.has(dsId)) this.destinations.set(dsId, new Map());
    const slackDest: OSDestination = {
      id: nextId(), type: 'slack', name: 'ops-alerts-slack',
      last_update_time: now, slack: { url: 'https://hooks.slack.com/services/xxx' },
    };
    this.destinations.get(dsId)!.set(slackDest.id, slackDest);

    // Monitors
    if (!this.monitors.has(dsId)) this.monitors.set(dsId, new Map());
    const monitors: OSMonitor[] = [
      {
        id: nextId(), type: 'monitor', monitor_type: 'query_level_monitor',
        name: 'High Error Rate', enabled: true, last_update_time: now,
        schedule: { period: { interval: 1, unit: 'MINUTES' } },
        inputs: [{ search: { indices: ['logs-*'], query: { query: { bool: { filter: [{ range: { '@timestamp': { gte: '{{period_end}}||-5m', lte: '{{period_end}}', format: 'epoch_millis' } } }] } }, size: 0, aggs: { error_count: { filter: { range: { status: { gte: 500 } } } } } } } }],
        triggers: [{
          id: nextId(), name: 'Error count > 100', severity: '1',
          condition: { script: { source: 'ctx.results[0].aggregations.error_count.doc_count > 100', lang: 'painless' } },
          actions: [{ id: nextId(), name: 'Notify Slack', destination_id: slackDest.id, message_template: { source: 'High error rate: {{ctx.results[0].aggregations.error_count.doc_count}} errors in last 5m' }, throttle_enabled: true, throttle: { value: 10, unit: 'MINUTES' } }],
        }],
      },
      {
        id: nextId(), type: 'monitor', monitor_type: 'query_level_monitor',
        name: 'Slow Response Time', enabled: true, last_update_time: now,
        schedule: { period: { interval: 5, unit: 'MINUTES' } },
        inputs: [{ search: { indices: ['apm-*'], query: { query: { bool: { filter: [{ range: { '@timestamp': { gte: '{{period_end}}||-10m', lte: '{{period_end}}', format: 'epoch_millis' } } }] } }, size: 0, aggs: { avg_latency: { avg: { field: 'transaction.duration.us' } } } } } }],
        triggers: [{
          id: nextId(), name: 'Avg latency > 5s', severity: '2',
          condition: { script: { source: 'ctx.results[0].aggregations.avg_latency.value > 5000000', lang: 'painless' } },
          actions: [{ id: nextId(), name: 'Notify Slack', destination_id: slackDest.id, message_template: { source: 'Slow responses: avg {{ctx.results[0].aggregations.avg_latency.value}}us' }, throttle_enabled: false }],
        }],
      },
      {
        id: nextId(), type: 'monitor', monitor_type: 'bucket_level_monitor',
        name: 'Disk Usage by Host', enabled: false, last_update_time: oneHourAgo,
        schedule: { period: { interval: 15, unit: 'MINUTES' } },
        inputs: [{ search: { indices: ['metrics-*'], query: { size: 0, query: { match_all: {} }, aggs: { hosts: { terms: { field: 'host.name' }, aggs: { disk_pct: { avg: { field: 'system.filesystem.used.pct' } } } } } } } }],
        triggers: [{
          id: nextId(), name: 'Disk > 90%', severity: '2',
          condition: { script: { source: 'params._count > 0 && params.disk_pct > 0.9', lang: 'painless' } },
          actions: [],
        }],
      },
    ];
    for (const m of monitors) this.monitors.get(dsId)!.set(m.id, m);

    // Alerts
    const osAlerts: OSAlert[] = [
      {
        id: nextId(), version: 1, monitor_id: monitors[0].id, monitor_name: monitors[0].name,
        monitor_version: 1, trigger_id: monitors[0].triggers[0].id, trigger_name: monitors[0].triggers[0].name,
        state: 'ACTIVE', severity: '1', error_message: null,
        start_time: fiveMinAgo, last_notification_time: now, end_time: null, acknowledged_time: null,
        action_execution_results: [{ action_id: monitors[0].triggers[0].actions[0].id, last_execution_time: now, throttled_count: 2 }],
      },
      {
        id: nextId(), version: 3, monitor_id: monitors[1].id, monitor_name: monitors[1].name,
        monitor_version: 1, trigger_id: monitors[1].triggers[0].id, trigger_name: monitors[1].triggers[0].name,
        state: 'ACKNOWLEDGED', severity: '2', error_message: null,
        start_time: oneHourAgo, last_notification_time: fiveMinAgo, end_time: null, acknowledged_time: fiveMinAgo,
        action_execution_results: [],
      },
    ];
    this.alerts.set(dsId, osAlerts);
  }
}

// ============================================================================
// Mock Prometheus / AMP Backend
// ============================================================================

export class MockPrometheusBackend implements PrometheusBackend {
  readonly type = 'prometheus' as const;
  private ruleGroups: Map<string, PromRuleGroup[]> = new Map();
  private activeAlerts: Map<string, PromAlert[]> = new Map();

  constructor(private readonly logger: Logger) {}

  async getRuleGroups(ds: Datasource): Promise<PromRuleGroup[]> {
    return this.ruleGroups.get(ds.id) ?? [];
  }

  async getAlerts(ds: Datasource): Promise<PromAlert[]> {
    return this.activeAlerts.get(ds.id) ?? [];
  }

  // --- Seeding ---

  seed(dsId: string): void {
    const now = new Date().toISOString();
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString();

    const groups: PromRuleGroup[] = [
      {
        name: 'node_alerts', file: '/etc/prometheus/rules/node.yml', interval: 60,
        rules: [
          {
            type: 'alerting', name: 'HighCpuUsage', health: 'ok', state: 'firing',
            query: '100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80',
            duration: 300,
            labels: { severity: 'warning', team: 'infra' },
            annotations: { summary: 'CPU usage above 80% on {{ $labels.instance }}', description: 'CPU has been above 80% for more than 5 minutes.' },
            alerts: [
              { labels: { alertname: 'HighCpuUsage', instance: 'i-0abc123:9100', severity: 'warning', team: 'infra' }, annotations: { summary: 'CPU usage above 80% on i-0abc123:9100' }, state: 'firing', activeAt: fiveMinAgo, value: '92.3' },
            ],
          },
          {
            type: 'alerting', name: 'HighMemoryUsage', health: 'ok', state: 'firing',
            query: '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 90',
            duration: 600,
            labels: { severity: 'critical', team: 'infra' },
            annotations: { summary: 'Memory usage above 90% on {{ $labels.instance }}' },
            alerts: [
              { labels: { alertname: 'HighMemoryUsage', instance: 'i-0def456:9100', severity: 'critical', team: 'infra' }, annotations: { summary: 'Memory usage above 90% on i-0def456:9100' }, state: 'firing', activeAt: tenMinAgo, value: '94.7' },
            ],
          },
          {
            type: 'alerting', name: 'DiskSpaceLow', health: 'ok', state: 'pending',
            query: '(node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 15',
            duration: 900,
            labels: { severity: 'warning', team: 'infra' },
            annotations: { summary: 'Disk space below 15% on {{ $labels.instance }}' },
            alerts: [
              { labels: { alertname: 'DiskSpaceLow', instance: 'i-0ghi789:9100', severity: 'warning', team: 'infra' }, annotations: { summary: 'Disk space below 15% on i-0ghi789:9100' }, state: 'pending', activeAt: now, value: '12.1' },
            ],
          },
        ],
      },
      {
        name: 'app_alerts', file: '/etc/prometheus/rules/app.yml', interval: 30,
        rules: [
          {
            type: 'alerting', name: 'HighErrorRate', health: 'ok', state: 'firing',
            query: 'sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05',
            duration: 300,
            labels: { severity: 'critical', team: 'platform' },
            annotations: { summary: 'Error rate above 5%', runbook_url: 'https://wiki.example.com/runbooks/high-error-rate' },
            alerts: [
              { labels: { alertname: 'HighErrorRate', severity: 'critical', team: 'platform' }, annotations: { summary: 'Error rate above 5%' }, state: 'firing', activeAt: fiveMinAgo, value: '0.082' },
            ],
          },
          {
            type: 'alerting', name: 'HighLatencyP99', health: 'ok', state: 'inactive',
            query: 'histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 2',
            duration: 300,
            labels: { severity: 'warning', team: 'platform' },
            annotations: { summary: 'P99 latency above 2s' },
            alerts: [],
          },
        ],
      },
    ];

    this.ruleGroups.set(dsId, groups);

    // Active alerts = all firing/pending alerts from rules
    const active: PromAlert[] = [];
    for (const g of groups) {
      for (const r of g.rules) {
        if (r.type === 'alerting') {
          for (const a of r.alerts) {
            if (a.state === 'firing' || a.state === 'pending') {
              active.push(a);
            }
          }
        }
      }
    }
    this.activeAlerts.set(dsId, active);
  }
}
