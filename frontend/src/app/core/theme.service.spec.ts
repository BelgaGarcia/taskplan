import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  ThemeService,
} from './theme.service';

describe('ThemeService', () => {
  let themeColor: HTMLMetaElement;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    themeColor = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    themeColor ??= document.head.appendChild(document.createElement('meta'));
    themeColor.name = 'theme-color';
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  afterEach(() => localStorage.clear());

  it('uses light when there is no saved preference', () => {
    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe(DEFAULT_THEME);
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(themeColor.content).toBe('#123458');
  });

  it('restores a saved preference and updates the document', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(themeColor.content).toBe('#101827');
  });

  it('persists a theme selected by the user', () => {
    const service = TestBed.inject(ThemeService);

    service.setTheme('dark');

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(service.isDark()).toBeTrue();
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });
});
