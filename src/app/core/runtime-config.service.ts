import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
  private readonly fallbackApiUrl = 'http://localhost:3000/api';
  private config?: { apiUrl?: string };
  async load(): Promise<void> { this.config = await fetch('/assets/runtime-config.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : {}).catch(() => ({})); }
  get apiUrl(): string { return (this.config?.apiUrl || this.fallbackApiUrl).replace(/\/$/, ''); }
}
