import { RuntimeConfigService } from './runtime-config.service';

describe('RuntimeConfigService', () => {
  afterEach(() => { window.__taskplanConfig = undefined; });

  it('uses the public API URL injected at runtime', () => {
    window.__taskplanConfig = { apiUrl: 'http://192.168.100.15:5183/api/' };
    expect(new RuntimeConfigService().apiUrl).toBe('http://192.168.100.15:5183/api');
  });

  it('falls back to the local API URL when no runtime config is present', () => {
    expect(new RuntimeConfigService().apiUrl).toBe('http://localhost:3000/api');
  });
});