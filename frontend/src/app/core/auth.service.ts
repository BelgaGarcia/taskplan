import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, finalize, map, shareReplay, tap, throwError } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';
import type { AccessLevel, User } from './models';

export interface Tokens { accessToken: string; refreshToken: string; user?: User; }
interface StoredSession { accessToken: string; refreshToken: string; user: User; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(RuntimeConfigService);
  private accessToken?: string;
  private refreshToken?: string;
  private refreshing$?: Observable<string>;
  readonly user$ = new BehaviorSubject<User | null>(null);

  initialize(): void {
    this.config.load();
    const raw = sessionStorage.getItem('taskplan.session');
    if (!raw) return;
    try {
      const session = JSON.parse(raw) as StoredSession;
      this.accessToken = session.accessToken;
      this.refreshToken = session.refreshToken;
      this.user$.next(session.user);
    } catch { sessionStorage.removeItem('taskplan.session'); }
  }

  login(email: string, password: string): Observable<Tokens> {
    return this.http.post<Tokens>(`${this.config.apiUrl}/auth/login`, { email, password }).pipe(tap((tokens) => this.apply(tokens)));
  }

  logout(): void {
    const token = this.refreshToken;
    this.clear();
    if (token) this.http.post(`${this.config.apiUrl}/auth/logout`, { refreshToken: token }).subscribe({ error: () => undefined });
  }

  get token(): string | undefined { return this.accessToken; }
  get isAuthenticated(): boolean { return !!this.accessToken; }
  get accessLevel(): AccessLevel | undefined { return this.user$.value?.role.accessLevel; }
  get isAdmin(): boolean { return this.accessLevel === 'ADMIN'; }
  get mustChangePassword(): boolean { return this.user$.value?.mustChangePassword === true; }

  refresh(): Observable<string> {
    if (!this.refreshToken) return throwError(() => new Error('Sessão não disponível'));
    if (!this.refreshing$) {
      this.refreshing$ = this.http.post<Tokens>(`${this.config.apiUrl}/auth/refresh`, { refreshToken: this.refreshToken }).pipe(
        tap((tokens) => this.apply(tokens)),
        map((tokens) => tokens.accessToken),
        finalize(() => this.refreshing$ = undefined),
        shareReplay(1),
      );
    }
    return this.refreshing$;
  }

  changeOwnPassword(currentPassword: string, newPassword: string): Observable<Tokens> {
    return this.http.patch<Tokens>(`${this.config.apiUrl}/auth/password`, { currentPassword, newPassword }).pipe(
      tap((tokens) => this.apply(tokens)),
    );
  }

  private apply(tokens: Tokens): void {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    if (tokens.user) this.user$.next(tokens.user);
    const user = this.user$.value;
    if (user) sessionStorage.setItem('taskplan.session', JSON.stringify({ accessToken: this.accessToken, refreshToken: this.refreshToken, user }));
  }

  private clear(): void {
    this.accessToken = undefined;
    this.refreshToken = undefined;
    this.user$.next(null);
    sessionStorage.removeItem('taskplan.session');
  }
}
