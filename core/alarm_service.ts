/**
 * Core alarm service — pure business logic, no platform dependencies.
 */
import { Alarm, AlarmService, AlarmsLogger, CreateAlarmInput } from './types';

export class InMemoryAlarmService implements AlarmService {
  private alarms: Map<string, Alarm> = new Map();
  private counter = 0;

  constructor(private readonly logger: AlarmsLogger) {}

  async list(): Promise<Alarm[]> {
    return Array.from(this.alarms.values());
  }

  async get(id: string): Promise<Alarm | null> {
    return this.alarms.get(id) ?? null;
  }

  async create(input: CreateAlarmInput): Promise<Alarm> {
    const id = `alarm-${++this.counter}`;
    const now = new Date().toISOString();
    const alarm: Alarm = {
      id,
      name: input.name,
      severity: input.severity,
      condition: input.condition,
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.alarms.set(id, alarm);
    this.logger.info(`Created alarm: ${id}`);
    return alarm;
  }

  async delete(id: string): Promise<boolean> {
    const existed = this.alarms.delete(id);
    if (existed) this.logger.info(`Deleted alarm: ${id}`);
    return existed;
  }

  async toggle(id: string): Promise<Alarm | null> {
    const alarm = this.alarms.get(id);
    if (!alarm) return null;
    alarm.enabled = !alarm.enabled;
    alarm.updatedAt = new Date().toISOString();
    this.logger.info(`Toggled alarm ${id}: enabled=${alarm.enabled}`);
    return alarm;
  }
}
