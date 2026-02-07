/**
 * Standalone Express server for the Alarms plugin.
 * Run with: npx ts-node plugins/alarms/standalone/server.ts
 * Or build and run: node dist/standalone/server.js
 */
import express from 'express';
import path from 'path';
import { InMemoryAlarmService, AlarmsLogger } from '../core';
import {
  handleListAlarms,
  handleGetAlarm,
  handleCreateAlarm,
  handleDeleteAlarm,
  handleToggleAlarm,
} from '../server/routes/handlers';

const PORT = process.env.PORT || 5603;

const logger: AlarmsLogger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  debug: (msg) => console.debug(`[DEBUG] ${msg}`),
};

const service = new InMemoryAlarmService(logger);
const app = express();

app.use(express.json());

// Serve static React build - path works for both dev and production
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// API routes — reuse the same handlers
app.get('/api/alarms', async (_req, res) => {
  const result = await handleListAlarms(service);
  res.status(result.status).json(result.body);
});

app.get('/api/alarms/:id', async (req, res) => {
  const result = await handleGetAlarm(service, req.params.id);
  res.status(result.status).json(result.body);
});

app.post('/api/alarms', async (req, res) => {
  const result = await handleCreateAlarm(service, req.body);
  res.status(result.status).json(result.body);
});

app.delete('/api/alarms/:id', async (req, res) => {
  const result = await handleDeleteAlarm(service, req.params.id);
  res.status(result.status).json(result.body);
});

app.post('/api/alarms/:id/toggle', async (req, res) => {
  const result = await handleToggleAlarm(service, req.params.id);
  res.status(result.status).json(result.body);
});

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
  logger.info(`Alarms standalone server running at http://localhost:${PORT}`);
});
