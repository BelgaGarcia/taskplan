import { RuntimeConfigService } from './runtime-config.service';

describe('RuntimeConfigService', () => {
  afterEach(() => { window.__taskplanConfig = undefined; });

  it('uses the public API URL injected at runtime', () => {
    window.__taskplanConfig = { apiUrl: 'http://192.168.100.15:5183/api/', release: '1.6.0' };
    expect(new RuntimeConfigService().apiUrl).toBe('http://192.168.100.15:5183/api');
    expect(new RuntimeConfigService().release).toBe('v1.6.0');
  });

  it('falls back to the local API URL when no runtime config is present', () => {
    expect(new RuntimeConfigService().apiUrl).toBe('http://localhost:3000/api');
    expect(new RuntimeConfigService().release).toBe('local');
  });

  it('does not duplicate an existing version prefix', () => {
    window.__taskplanConfig = { release: 'v1.6.0' };
    expect(new RuntimeConfigService().release).toBe('v1.6.0');
  });
});
