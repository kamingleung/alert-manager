/**
 * Route handlers — pure functions that work with any HTTP framework.
 */
import {
  AlertService,
  CreateAlertRuleInput,
  Datasource,
  DatasourceService,
  UpdateAlertRuleInput,
} from '../../core';

// ============================================================================
// Datasource Handlers
// ============================================================================

export async function handleListDatasources(service: DatasourceService) {
  const datasources = await service.list();
  return { status: 200, body: { datasources } };
}

export async function handleGetDatasource(service: DatasourceService, id: string) {
  const datasource = await service.get(id);
  if (!datasource) return { status: 404, body: { error: 'Datasource not found' } };
  return { status: 200, body: datasource };
}

export async function handleCreateDatasource(
  service: DatasourceService,
  input: Omit<Datasource, 'id'>
) {
  if (!input.name || !input.type || !input.url) {
    return { status: 400, body: { error: 'name, type, and url are required' } };
  }
  if (input.type !== 'opensearch' && input.type !== 'prometheus') {
    return { status: 400, body: { error: 'type must be opensearch or prometheus' } };
  }
  const datasource = await service.create(input);
  return { status: 201, body: datasource };
}

export async function handleUpdateDatasource(
  service: DatasourceService,
  id: string,
  input: Partial<Datasource>
) {
  const datasource = await service.update(id, input);
  if (!datasource) return { status: 404, body: { error: 'Datasource not found' } };
  return { status: 200, body: datasource };
}

export async function handleDeleteDatasource(service: DatasourceService, id: string) {
  const deleted = await service.delete(id);
  if (!deleted) return { status: 404, body: { error: 'Datasource not found' } };
  return { status: 200, body: { deleted: true } };
}

export async function handleTestDatasource(service: DatasourceService, id: string) {
  const result = await service.testConnection(id);
  return { status: result.success ? 200 : 400, body: result };
}

// ============================================================================
// Alert Handlers
// ============================================================================

export async function handleGetAllAlerts(service: AlertService) {
  try {
    const alerts = await service.getAllAlerts();
    return { status: 200, body: { alerts } };
  } catch (err) {
    return { status: 500, body: { error: String(err) } };
  }
}

export async function handleGetAlertsByDatasource(service: AlertService, datasourceId: string) {
  try {
    const alerts = await service.getAlertsByDatasource(datasourceId);
    return { status: 200, body: { alerts } };
  } catch (err) {
    return { status: 404, body: { error: String(err) } };
  }
}

// ============================================================================
// Alert Rule Handlers
// ============================================================================

export async function handleGetAllRules(service: AlertService) {
  try {
    const rules = await service.getAllRules();
    return { status: 200, body: { rules } };
  } catch (err) {
    return { status: 500, body: { error: String(err) } };
  }
}

export async function handleGetRulesByDatasource(service: AlertService, datasourceId: string) {
  try {
    const rules = await service.getRulesByDatasource(datasourceId);
    return { status: 200, body: { rules } };
  } catch (err) {
    return { status: 404, body: { error: String(err) } };
  }
}

export async function handleGetRule(
  service: AlertService,
  datasourceId: string,
  ruleId: string
) {
  const rule = await service.getRule(datasourceId, ruleId);
  if (!rule) return { status: 404, body: { error: 'Rule not found' } };
  return { status: 200, body: rule };
}

export async function handleCreateRule(service: AlertService, input: CreateAlertRuleInput) {
  if (!input.datasourceId || !input.name || !input.severity || !input.query || !input.condition) {
    return {
      status: 400,
      body: { error: 'datasourceId, name, severity, query, and condition are required' },
    };
  }
  try {
    const rule = await service.createRule(input);
    return { status: 201, body: rule };
  } catch (err) {
    return { status: 400, body: { error: String(err) } };
  }
}

export async function handleUpdateRule(
  service: AlertService,
  datasourceId: string,
  ruleId: string,
  input: UpdateAlertRuleInput
) {
  const rule = await service.updateRule(datasourceId, ruleId, input);
  if (!rule) return { status: 404, body: { error: 'Rule not found' } };
  return { status: 200, body: rule };
}

export async function handleDeleteRule(
  service: AlertService,
  datasourceId: string,
  ruleId: string
) {
  const deleted = await service.deleteRule(datasourceId, ruleId);
  if (!deleted) return { status: 404, body: { error: 'Rule not found' } };
  return { status: 200, body: { deleted: true } };
}

export async function handleToggleRule(
  service: AlertService,
  datasourceId: string,
  ruleId: string
) {
  const rule = await service.toggleRule(datasourceId, ruleId);
  if (!rule) return { status: 404, body: { error: 'Rule not found' } };
  return { status: 200, body: rule };
}
