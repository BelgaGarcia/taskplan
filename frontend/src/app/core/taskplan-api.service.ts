import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';
import type { CalendarResponse, DashboardSummary, FilterOptions, Occurrence, OccurrenceResult, PaginatedResponse, PositionHierarchy } from './models';

export type QueryValue = string | number | boolean | null | undefined;
export type Query = Record<string, QueryValue>;

@Injectable({ providedIn: 'root' })
export class TaskPlanApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(RuntimeConfigService);

  list<T>(endpoint: string, query: Query = {}): Observable<PaginatedResponse<T>> {
    return this.http.get<PaginatedResponse<T>>(this.url(endpoint), { params: this.params(query) });
  }

  get<T>(endpoint: string, id: string): Observable<T> { return this.http.get<T>(this.url(`${endpoint}/${id}`)); }
  fetch<T>(endpoint: string): Observable<T> { return this.http.get<T>(this.url(endpoint)); }
  create<T>(endpoint: string, body: object): Observable<T> { return this.http.post<T>(this.url(endpoint), body); }
  update<T>(endpoint: string, id: string, body: object): Observable<T> { return this.http.patch<T>(this.url(`${endpoint}/${id}`), body); }
  reactivatePeriodicity<T>(id: string): Observable<T> { return this.http.patch<T>(this.url(`periodicities/${id}/reactivate`), {}); }
  resetUserPassword<T>(id: string, body: { mode: 'SET' | 'TEMPORARY'; password?: string }): Observable<{ user: T; invalidatedSessions: number; temporaryPassword?: string }> { return this.http.patch<{ user: T; invalidatedSessions: number; temporaryPassword?: string }>(this.url(`users/${id}/password`), body); }
  inactivate<T>(endpoint: string, id: string): Observable<T> { return this.http.delete<T>(this.url(`${endpoint}/${id}`)); }
  dashboard(): Observable<DashboardSummary> { return this.http.get<DashboardSummary>(this.url('dashboard/summary')); }
  calendar(query: Query): Observable<CalendarResponse> { return this.http.get<CalendarResponse>(this.url('task-occurrences/calendar'), { params: this.params(query) }); }
  occurrenceOptions(): Observable<FilterOptions> { return this.http.get<FilterOptions>(this.url('task-occurrences/filter-options')); }
  occurrence(id: string): Observable<Occurrence> { return this.http.get<Occurrence>(this.url(`task-occurrences/${id}`)); }
  startOccurrence(id: string): Observable<Occurrence> { return this.http.patch<Occurrence>(this.url(`task-occurrences/${id}/start`), {}); }
  completeOccurrence(id: string, body: { result: OccurrenceResult; actualDurationMinutes?: number; notes?: string }): Observable<Occurrence> { return this.http.patch<Occurrence>(this.url(`task-occurrences/${id}/complete`), body); }
  rescheduleOccurrence(id: string, body: { scheduledDate: string; scheduledTime?: string }): Observable<Occurrence> { return this.http.patch<Occurrence>(this.url(`task-occurrences/${id}/reschedule`), body); }
  generateAgenda(body: { from: string; to: string }): Observable<object> { return this.http.post(this.url('task-occurrences/generate'), body); }
  deleteOccurrence(id: string, scope: 'current' | 'future'): Observable<{ id: string; scope: string; removedCount: number }> { return this.http.delete<{ id: string; scope: string; removedCount: number }>(this.url(`task-occurrences/${id}`), { params: { scope } }); }
  positionHierarchy(): Observable<PositionHierarchy> { return this.fetch<PositionHierarchy>('positions/hierarchy'); }
  updatePositionHierarchy(inheritances: Array<{ positionId: string; inheritedPositionId: string }>): Observable<PositionHierarchy> { return this.http.patch<PositionHierarchy>(this.url('positions/hierarchy'), { inheritances }); }
  private url(path: string): string { return `${this.config.apiUrl}/${path}`; }
  private params(query: Query): HttpParams {
    return Object.entries(query).reduce((params, [key, value]) => value === null || value === undefined || value === '' ? params : params.set(key, String(value)), new HttpParams());
  }
}
