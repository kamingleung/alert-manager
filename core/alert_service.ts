/**
 * Alert service — orchestrates multiple alerting backends
 */
import {
  Alert,
  AlertingBackend,
  AlertRule,
  AlertService,
  CreateAlertRuleInput,
  DatasourceService,
  DatasourceType,
  Logger,
  UpdateAlertRuleInput,
} from './types';

export class MultiBackendAlertService implements AlertService {
  private backends: Map<DatasourceType, AlertingBackend> = new Map();

  constructor(
    private readonly datasourceService: DatasourceService,
    private readonly logger: Logger
  ) {}

  registerBackend(backend: AlertingBackend): void {
    this.backends.set(backend.type, backend);
    this.logger.info(`Registered alerting backend: ${backend.type}`);
  }

  private getBackend(type: DatasourceType): AlertingBackend {
    const backend = this.backends.get(type);
    if (!backend) {
      throw new Error(`No backend registered for type: ${type}`);
    }
    return backend;
  }

  // =========================================================================
  // Alerts
  // =========================================================================

  async getAllAlerts(): Promise<Alert[]> {
    const datasources = await this.datasourceService.list();
    const enabledDatasources = datasources.filter(ds => ds.enabled);
    
    const alertPromises = enabledDatasources.map(async (ds) => {
      try {
        const backend = this.getBackend(ds.type);
        return await backend.getAlerts(ds);
      } catch (err) {
        this.logger.error(`Failed to get alerts from ${ds.name}: ${err}`);
        return [];
      }
    });

    const alertArrays = await Promise.all(alertPromises);
    return alertArrays.flat();
  }

  async getAlertsByDatasource(datasourceId: string): Promise<Alert[]> {
    const datasource = await this.datasourceService.get(datasourceId);
    if (!datasource) {
      throw new Error(`Datasource not found: ${datasourceId}`);
    }
    
    const backend = this.getBackend(datasource.type);
    return backend.getAlerts(datasource);
  }

  // =========================================================================
  // Rules
  // =========================================================================

  async getAllRules(): Promise<AlertRule[]> {
    const datasources = await this.datasourceService.list();
    const enabledDatasources = datasources.filter(ds => ds.enabled);
    
    const rulePromises = enabledDatasources.map(async (ds) => {
      try {
        const backend = this.getBackend(ds.type);
        return await backend.getRules(ds);
      } catch (err) {
        this.logger.error(`Failed to get rules from ${ds.name}: ${err}`);
        return [];
      }
    });

    const ruleArrays = await Promise.all(rulePromises);
    return ruleArrays.flat();
  }

  async getRulesByDatasource(datasourceId: string): Promise<AlertRule[]> {
    const datasource = await this.datasourceService.get(datasourceId);
    if (!datasource) {
      throw new Error(`Datasource not found: ${datasourceId}`);
    }
    
    const backend = this.getBackend(datasource.type);
    return backend.getRules(datasource);
  }

  async getRule(datasourceId: string, ruleId: string): Promise<AlertRule | null> {
    const datasource = await this.datasourceService.get(datasourceId);
    if (!datasource) return null;
    
    const backend = this.getBackend(datasource.type);
    return backend.getRule(datasource, ruleId);
  }

  async createRule(input: CreateAlertRuleInput): Promise<AlertRule> {
    const datasource = await this.datasourceService.get(input.datasourceId);
    if (!datasource) {
      throw new Error(`Datasource not found: ${input.datasourceId}`);
    }
    
    const backend = this.getBackend(datasource.type);
    return backend.createRule(datasource, input);
  }

  async updateRule(
    datasourceId: string,
    ruleId: string,
    input: UpdateAlertRuleInput
  ): Promise<AlertRule | null> {
    const datasource = await this.datasourceService.get(datasourceId);
    if (!datasource) return null;
    
    const backend = this.getBackend(datasource.type);
    return backend.updateRule(datasource, ruleId, input);
  }

  async deleteRule(datasourceId: string, ruleId: string): Promise<boolean> {
    const datasource = await this.datasourceService.get(datasourceId);
    if (!datasource) return false;
    
    const backend = this.getBackend(datasource.type);
    return backend.deleteRule(datasource, ruleId);
  }

  async toggleRule(datasourceId: string, ruleId: string): Promise<AlertRule | null> {
    const datasource = await this.datasourceService.get(datasourceId);
    if (!datasource) return null;
    
    const backend = this.getBackend(datasource.type);
    return backend.toggleRule(datasource, ruleId);
  }
}
