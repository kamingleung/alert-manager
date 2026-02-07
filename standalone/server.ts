/**
 * Standalone Express server for the Alert Manager.
 * Supports multiple alerting backends with mock mode for development.
 */
import express from 'express';
import path from 'path';
import {
  InMemoryDatasourceService,
  MultiBackendAlertService,
  MockAlertingBackend,
  Logger,
} from '../core';
import {
  handleListDatasources,
  handleGetDatasource,
  handleCreateDatasource,
  handleUpdateDatasource,
  handleDeleteDatasource,
  handleTestDatasource,
  handleGetAllAlerts,
  handleGetAlertsByDatasource,
  handleGetAllRules,
  handleGetRulesByDatasource,
  handleGetRule,
  handleCreateRule,
  handleUpdateRule,
  handleDeleteRule,
  handleToggleRule,
} from '../server/routes/handlers';

const PORT = process.env.PORT || 5603;
const MOCK_MODE = process.env.MOCK_MODE !== 'false'; // Default to mock mode

const logger: Logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  debug: (msg) => console.debug(`[DEBUG] ${msg}`),
};

// Initialize services
const datasourceService = new InMemoryDatasourceService(logger);
const alertService = new MultiBackendAlertService(datasourceService, logger);

// Register mock backends
const opensearchBackend = new MockAlertingBackend('opensearch', logger);
const prometheusBackend = new MockAlertingBackend('prometheus', logger);
alertService.registerBackend(opensearchBackend);
alertService.registerBackend(prometheusBackend);

// Seed mock datasources
if (MOCK_MODE) {
  logger.info('Running in MOCK MODE - seeding sample datasources');
  
  datasourceService.seed([
    {
      name: 'OpenSearch Production',
      type: 'opensearch',
      url: 'https://opensearch.example.com:9200',
      enabled: true,
    },
    {
      name: 'Prometheus US-East',
      type: 'prometheus',
      url: 'https://aps-workspaces.us-east-1.amazonaws.com/workspaces/ws-xxx',
      enabled: true,
    },
    {
      name: 'OpenSearch Staging',
      type: 'opensearch',
      url: 'https://opensearch-staging.example.com:9200',
      enabled: true,
    },
  ]);

  // Seed some mock rules
  opensearchBackend.seedRules('ds-1', [
    {
      name: 'High Error Rate',
      enabled: true,
      severity: 'critical',
      query: 'status:>=500',
      condition: 'count() > 100',
      duration: '5m',
      labels: { team: 'platform' },
      annotations: { summary: 'Error rate exceeded threshold' },
    },
    {
      name: 'Slow Response Time',
      enabled: true,
      severity: 'high',
      query: 'response_time:>5000',
      condition: 'avg() > 5000',
      duration: '10m',
      labels: { team: 'platform' },
      annotations: { summary: 'Response time is too slow' },
    },
  ]);

  prometheusBackend.seedRules('ds-2', [
    {
      name: 'High CPU Usage',
      enabled: true,
      severity: 'high',
      query: '100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)',
      condition: '> 80',
      duration: '5m',
      labels: { team: 'infra' },
      annotations: { summary: 'CPU usage is above 80%' },
    },
    {
      name: 'Memory Pressure',
      enabled: true,
      severity: 'medium',
      query: '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100',
      condition: '> 90',
      duration: '10m',
      labels: { team: 'infra' },
      annotations: { summary: 'Memory usage is above 90%' },
    },
  ]);
}

const app = express();
app.use(express.json());

// Serve static React build
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// ============================================================================
// Datasource Routes
// ============================================================================

app.get('/api/datasources', async (_req, res) => {
  const result = await handleListDatasources(datasourceService);
  res.status(result.status).json(result.body);
});

app.get('/api/datasources/:id', async (req, res) => {
  const result = await handleGetDatasource(datasourceService, req.params.id);
  res.status(result.status).json(result.body);
});

app.post('/api/datasources', async (req, res) => {
  const result = await handleCreateDatasource(datasourceService, req.body);
  res.status(result.status).json(result.body);
});

app.put('/api/datasources/:id', async (req, res) => {
  const result = await handleUpdateDatasource(datasourceService, req.params.id, req.body);
  res.status(result.status).json(result.body);
});

app.delete('/api/datasources/:id', async (req, res) => {
  const result = await handleDeleteDatasource(datasourceService, req.params.id);
  res.status(result.status).json(result.body);
});

app.post('/api/datasources/:id/test', async (req, res) => {
  const result = await handleTestDatasource(datasourceService, req.params.id);
  res.status(result.status).json(result.body);
});

// ============================================================================
// Alert Routes
// ============================================================================

app.get('/api/alerts', async (_req, res) => {
  const result = await handleGetAllAlerts(alertService);
  res.status(result.status).json(result.body);
});

app.get('/api/datasources/:datasourceId/alerts', async (req, res) => {
  const result = await handleGetAlertsByDatasource(alertService, req.params.datasourceId);
  res.status(result.status).json(result.body);
});

// ============================================================================
// Alert Rule Routes
// ============================================================================

app.get('/api/rules', async (_req, res) => {
  const result = await handleGetAllRules(alertService);
  res.status(result.status).json(result.body);
});

app.get('/api/datasources/:datasourceId/rules', async (req, res) => {
  const result = await handleGetRulesByDatasource(alertService, req.params.datasourceId);
  res.status(result.status).json(result.body);
});

app.get('/api/datasources/:datasourceId/rules/:ruleId', async (req, res) => {
  const result = await handleGetRule(alertService, req.params.datasourceId, req.params.ruleId);
  res.status(result.status).json(result.body);
});

app.post('/api/rules', async (req, res) => {
  const result = await handleCreateRule(alertService, req.body);
  res.status(result.status).json(result.body);
});

app.put('/api/datasources/:datasourceId/rules/:ruleId', async (req, res) => {
  const result = await handleUpdateRule(
    alertService,
    req.params.datasourceId,
    req.params.ruleId,
    req.body
  );
  res.status(result.status).json(result.body);
});

app.delete('/api/datasources/:datasourceId/rules/:ruleId', async (req, res) => {
  const result = await handleDeleteRule(
    alertService,
    req.params.datasourceId,
    req.params.ruleId
  );
  res.status(result.status).json(result.body);
});

app.post('/api/datasources/:datasourceId/rules/:ruleId/toggle', async (req, res) => {
  const result = await handleToggleRule(
    alertService,
    req.params.datasourceId,
    req.params.ruleId
  );
  res.status(result.status).json(result.body);
});

// ============================================================================
// SPA Fallback
// ============================================================================

app.get('*', (_req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
  logger.info(`Alert Manager running at http://localhost:${PORT}`);
  logger.info(`Mock mode: ${MOCK_MODE ? 'ENABLED' : 'DISABLED'}`);
});
