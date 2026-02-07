/**
 * Core types for the Alert Manager plugin.
 * Supports multiple alerting backends: OpenSearch Alerting, Amazon Managed Prometheus
 */

// ============================================================================
// Datasource Types
// ============================================================================

export type DatasourceType = 'opensearch' | 'prometheus';

export interface Datasource {
  id: string;
  name: string;
  type: DatasourceType;
  url: string;
  enabled: boolean;
  auth?: {
    type: 'basic' | 'apikey' | 'sigv4';
    credentials?: Record<string, string>;
  };
}

// ============================================================================
// Alert Types (unified across backends)
// ============================================================================

export type AlertState = 'OK' | 'ALERTING' | 'PENDING' | 'NO_DATA' | 'ERROR';
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface Alert {
  id: string;
  datasourceId: string;
  name: string;
  state: AlertState;
  severity: AlertSeverity;
  message?: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt?: string;
  endsAt?: string;
  updatedAt: string;
  fingerprint?: string;
  generatorURL?: string;
}

// ============================================================================
// Alert Rule Types
// ============================================================================

export interface AlertRule {
  id: string;
  datasourceId: string;
  name: string;
  enabled: boolean;
  severity: AlertSeverity;
  query: string;
  condition: string;
  duration?: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertRuleInput {
  datasourceId: string;
  name: string;
  severity: AlertSeverity;
  query: string;
  condition: string;
  duration?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  enabled?: boolean;
}

export interface UpdateAlertRuleInput {
  name?: string;
  severity?: AlertSeverity;
  query?: string;
  condition?: string;
  duration?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  enabled?: boolean;
}

// ============================================================================
// Alert Group Types (for Prometheus-style grouping)
// ============================================================================

export interface AlertGroup {
  name: string;
  file: string;
  rules: AlertRule[];
  interval?: string;
}

// ============================================================================
// Service Interfaces
// ============================================================================

export interface AlertingBackend {
  readonly type: DatasourceType;
  
  // Alerts (firing/resolved)
  getAlerts(datasource: Datasource): Promise<Alert[]>;
  
  // Alert Rules
  getRules(datasource: Datasource): Promise<AlertRule[]>;
  getRule(datasource: Datasource, ruleId: string): Promise<AlertRule | null>;
  createRule(datasource: Datasource, input: CreateAlertRuleInput): Promise<AlertRule>;
  updateRule(datasource: Datasource, ruleId: string, input: UpdateAlertRuleInput): Promise<AlertRule | null>;
  deleteRule(datasource: Datasource, ruleId: string): Promise<boolean>;
  toggleRule(datasource: Datasource, ruleId: string): Promise<AlertRule | null>;
}

export interface DatasourceService {
  list(): Promise<Datasource[]>;
  get(id: string): Promise<Datasource | null>;
  create(input: Omit<Datasource, 'id'>): Promise<Datasource>;
  update(id: string, input: Partial<Datasource>): Promise<Datasource | null>;
  delete(id: string): Promise<boolean>;
  testConnection(id: string): Promise<{ success: boolean; message: string }>;
}

export interface AlertService {
  // Aggregated across all datasources
  getAllAlerts(): Promise<Alert[]>;
  getAlertsByDatasource(datasourceId: string): Promise<Alert[]>;
  
  // Rules
  getAllRules(): Promise<AlertRule[]>;
  getRulesByDatasource(datasourceId: string): Promise<AlertRule[]>;
  getRule(datasourceId: string, ruleId: string): Promise<AlertRule | null>;
  createRule(input: CreateAlertRuleInput): Promise<AlertRule>;
  updateRule(datasourceId: string, ruleId: string, input: UpdateAlertRuleInput): Promise<AlertRule | null>;
  deleteRule(datasourceId: string, ruleId: string): Promise<boolean>;
  toggleRule(datasourceId: string, ruleId: string): Promise<AlertRule | null>;
}

// ============================================================================
// Logger
// ============================================================================

export interface Logger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
  debug(msg: string): void;
}
