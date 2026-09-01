import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'taskplan.theme';
export const DEFAULT_THEME: Theme = 'light';

const themeColors: Record<Theme, string> = {
  light: '#123458',
  dark: '#101827',
};

function storageFor(documentRef: Document): Storage | null {
  try {
    return documentRef.defaultView?.localStorage ?? null;
  } catch {
    return null;
  }
}

function storedTheme(storage: Storage | null): Theme {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyThemeToDocument(theme: Theme, documentRef: Document): void {
  documentRef.documentElement.dataset['theme'] = theme;
  documentRef
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', themeColors[theme]);
}

export function initializeTheme(documentRef: Document): Theme {
  const theme = storedTheme(storageFor(documentRef));
  applyThemeToDocument(theme, documentRef);
  return theme;
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly documentRef = inject(DOCUMENT);
  readonly theme = signal<Theme>(initializeTheme(this.documentRef));

  isDark(): boolean {
    return this.theme() === 'dark';
  }

  toggle(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
    applyThemeToDocument(theme, this.documentRef);
    try {
      storageFor(this.documentRef)?.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The visual preference still works when browser storage is unavailable.
    }
  }
}
