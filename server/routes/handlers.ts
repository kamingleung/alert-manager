/**
 * Route handlers — pure functions that work with any HTTP framework.
 * They take parsed input and return plain objects.
 */
import { AlarmService, CreateAlarmInput } from '../../core';

export async function handleListAlarms(service: AlarmService) {
  const alarms = await service.list();
  return { status: 200, body: { alarms } };
}

export async function handleGetAlarm(service: AlarmService, id: string) {
  const alarm = await service.get(id);
  if (!alarm) return { status: 404, body: { error: 'Alarm not found' } };
  return { status: 200, body: alarm };
}

export async function handleCreateAlarm(service: AlarmService, input: CreateAlarmInput) {
  if (!input.name || !input.severity || !input.condition) {
    return { status: 400, body: { error: 'name, severity, and condition are required' } };
  }
  const alarm = await service.create(input);
  return { status: 201, body: alarm };
}

export async function handleDeleteAlarm(service: AlarmService, id: string) {
  const deleted = await service.delete(id);
  if (!deleted) return { status: 404, body: { error: 'Alarm not found' } };
  return { status: 200, body: { deleted: true } };
}

export async function handleToggleAlarm(service: AlarmService, id: string) {
  const alarm = await service.toggle(id);
  if (!alarm) return { status: 404, body: { error: 'Alarm not found' } };
  return { status: 200, body: alarm };
}
