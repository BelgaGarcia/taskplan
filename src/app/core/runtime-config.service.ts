import { Injectable } from '@angular/core';

declare global { interface Window { __taskplanConfig?: { apiUrl?: string }; } }

@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
  private readonly fallbackApiUrl = 'http://localhost:3000/api';
  private readonly config = window.__taskplanConfig ?? {};
  load(): void {}
  get apiUrl(): string { return (this.config.apiUrl || this.fallbackApiUrl).replace(/\/$/, ''); }
}