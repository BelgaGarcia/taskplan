import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from '../core/theme.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'tp-theme-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <button
      type="button"
      class="icon-button theme-toggle"
      [attr.aria-label]="actionLabel"
      [attr.aria-pressed]="theme.isDark()"
      [title]="actionLabel"
      (click)="theme.toggle()"
    >
      <tp-icon [name]="theme.isDark() ? 'sun' : 'moon'"></tp-icon>
      <span class="sr-only">{{ actionLabel }}</span>
    </button>
  `,
})
export class ThemeToggleComponent {
  readonly theme = inject(ThemeService);

  get actionLabel(): string {
    return this.theme.isDark() ? 'Ativar tema claro' : 'Ativar tema escuro';
  }
}
