/**
 * OSD route adapter — wires framework-agnostic handlers to OSD's IRouter.
 */
import { schema } from '@osd/config-schema';
import { IRouter } from '../../../../src/core/server';
import { AlarmService } from '../../core';
import {
  handleListAlarms,
  handleGetAlarm,
  handleCreateAlarm,
  handleDeleteAlarm,
  handleToggleAlarm,
} from './handlers';

export function defineRoutes(router: IRouter, service: AlarmService) {
  router.get(
    { path: '/api/alarms', validate: false },
    async (_ctx, _req, res) => {
      const result = await handleListAlarms(service);
      return res.ok({ body: result.body });
    }
  );

  router.get(
    {
      path: '/api/alarms/{id}',
      validate: { params: schema.object({ id: schema.string() }) },
    },
    async (_ctx, req, res) => {
      const result = await handleGetAlarm(service, req.params.id);
      return result.status === 200 ? res.ok({ body: result.body }) : res.notFound({ body: result.body });
    }
  );

  router.post(
    {
      path: '/api/alarms',
      validate: {
        body: schema.object({
          name: schema.string(),
          severity: schema.oneOf([
            schema.literal('critical'),
            schema.literal('high'),
            schema.literal('medium'),
            schema.literal('low'),
          ]),
          condition: schema.string(),
          enabled: schema.maybe(schema.boolean()),
        }),
      },
    },
    async (_ctx, req, res) => {
      const result = await handleCreateAlarm(service, req.body);
      return res.ok({ body: result.body });
    }
  );

  router.delete(
    {
      path: '/api/alarms/{id}',
      validate: { params: schema.object({ id: schema.string() }) },
    },
    async (_ctx, req, res) => {
      const result = await handleDeleteAlarm(service, req.params.id);
      return result.status === 200 ? res.ok({ body: result.body }) : res.notFound({ body: result.body });
    }
  );

  router.post(
    {
      path: '/api/alarms/{id}/toggle',
      validate: { params: schema.object({ id: schema.string() }) },
    },
    async (_ctx, req, res) => {
      const result = await handleToggleAlarm(service, req.params.id);
      return result.status === 200 ? res.ok({ body: result.body }) : res.notFound({ body: result.body });
    }
  );
}
