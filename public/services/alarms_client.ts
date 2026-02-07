/**
 * HTTP client for the alarms API.
 * Works in both OSD and standalone mode via the basePath abstraction.
 */
import { Alarm, CreateAlarmInput } from '../../core';

export interface HttpClient {
  get<T = any>(path: string): Promise<T>;
  post<T = any>(path: string, body?: any): Promise<T>;
  delete<T = any>(path: string): Promise<T>;
}

export class AlarmsApiClient {
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<Alarm[]> {
    const res = await this.http.get<{ alarms: Alarm[] }>('/api/alarms');
    return res.alarms;
  }

  async get(id: string): Promise<Alarm> {
    return this.http.get<Alarm>(`/api/alarms/${id}`);
  }

  async create(input: CreateAlarmInput): Promise<Alarm> {
    return this.http.post<Alarm>('/api/alarms', input);
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`/api/alarms/${id}`);
  }

  async toggle(id: string): Promise<Alarm> {
    return this.http.post<Alarm>(`/api/alarms/${id}/toggle`);
  }
}
