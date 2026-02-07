/**
 * Core types for the Alarms plugin.
 * These are platform-agnostic — no OSD or Express imports.
 */

export interface Alarm {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  enabled: boolean;
  condition: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlarmInput {
  name: string;
  severity: Alarm['severity'];
  condition: string;
  enabled?: boolean;
}

export interface AlarmService {
  list(): Promise<Alarm[]>;
  get(id: string): Promise<Alarm | null>;
  create(input: CreateAlarmInput): Promise<Alarm>;
  delete(id: string): Promise<boolean>;
  toggle(id: string): Promise<Alarm | null>;
}

export interface AlarmsLogger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
  debug(msg: string): void;
}
