import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY } from '../core/theme.service';
import { IconComponent } from './icon.component';
import { ThemeToggleComponent } from './theme-toggle.component';

describe('ThemeToggleComponent', () => {
  let fixture: ComponentFixture<ThemeToggleComponent>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ThemeToggleComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(ThemeToggleComponent);
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('toggles the theme and exposes the available action accessibly', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(button.getAttribute('aria-label')).toBe('Ativar tema escuro');
    expect(button.getAttribute('title')).toBe('Ativar tema escuro');
    expect(button.getAttribute('aria-pressed')).toBe('false');

    button.click();
    fixture.detectChanges();

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(button.getAttribute('aria-label')).toBe('Ativar tema claro');
    expect(button.getAttribute('title')).toBe('Ativar tema claro');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(fixture.debugElement.query(By.directive(IconComponent)).componentInstance.name).toBe('sun');
  });
});
