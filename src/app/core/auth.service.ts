import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, finalize, map, shareReplay, tap, throwError } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface User { id: string; name: string; email: string; role: { id: string; name: string }; position?: { id: string; name: string } | null; }
interface Tokens { accessToken: string; refreshToken: string; user?: User; }
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient); private readonly config = inject(RuntimeConfigService);
  private accessToken?: string; private refreshToken?: string; private refreshing$?: Observable<string>;
  readonly user$ = new BehaviorSubject<User | null>(null);
  async initialize(): Promise<void> { await this.config.load(); }
  login(email: string, password: string) { return this.http.post<Tokens>(`${this.config.apiUrl}/auth/login`, { email, password }).pipe(tap(tokens => this.apply(tokens))); }
  logout(): void { const token = this.refreshToken; this.clear(); if (token) this.http.post(`${this.config.apiUrl}/auth/logout`, { refreshToken: token }).subscribe({ error: () => undefined }); }
  get token(): string | undefined { return this.accessToken; }
  get isAuthenticated(): boolean { return !!this.accessToken; }
  refresh(): Observable<string> {
    if (!this.refreshToken) return throwError(() => new Error('Sessão não disponível'));
    if (!this.refreshing$) this.refreshing$ = this.http.post<Tokens>(`${this.config.apiUrl}/auth/refresh`, { refreshToken: this.refreshToken }).pipe(tap(t => this.apply(t)), map(t => t.accessToken), finalize(() => this.refreshing$ = undefined), shareReplay(1));
    return this.refreshing$;
  }
  private apply(tokens: Tokens): void { this.accessToken = tokens.accessToken; this.refreshToken = tokens.refreshToken; if (tokens.user) this.user$.next(tokens.user); }
  private clear(): void { this.accessToken = undefined; this.refreshToken = undefined; this.user$.next(null); }
}
