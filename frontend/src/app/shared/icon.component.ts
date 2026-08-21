import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgFor } from '@angular/common';

export const iconNames = [
  'app', 'calendar', 'today', 'checklist', 'task', 'function', 'repeat',
  'holiday', 'users', 'briefcase', 'shield', 'report', 'settings', 'menu',
  'search', 'bell', 'chevron-left', 'chevron-right', 'chevron-down', 'plus',
  'filter', 'close', 'edit', 'eye', 'play', 'check', 'rotate', 'logout',
  'clock', 'warning', 'more', 'key',
] as const;

export type IconName = (typeof iconNames)[number];

type IconSymbol = { paths: readonly string[] };

const symbols: Record<IconName, IconSymbol> = {
  app: { paths: ['M7 3h10l4 4v14H3V3h4zm1 3v3h8V6H8zm-1 7h10v5H7v-5zm12-6h-2v2h2V7z'] },
  calendar: { paths: ['M7 2v3M17 2v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm3 8h3v3H8v-3zm5 0h3v3h-3v-3z'] },
  today: { paths: ['M12 3a9 9 0 1 0 9 9M12 7v5l3 2M7 3l-3 3 3 3M17 3l3 3-3 3'] },
  checklist: { paths: ['M9 6h10M9 12h10M9 18h10M4 6.5l1.4 1.4L7.5 5.5M4 12.5l1.4 1.4 2.1-2.4M4 18.5l1.4 1.4 2.1-2.4'] },
  task: { paths: ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm3 9 2.2 2.2L16 8.5'] },
  function: { paths: ['M4 7h16M4 17h16M7 4v6M17 14v6M7 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'] },
  repeat: { paths: ['M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h14M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H4'] },
  holiday: { paths: ['M12 3v18M5 7h14M6 7l2 7h8l2-7M8 14l-3 6M16 14l3 6'] },
  users: { paths: ['M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm7-5a3 3 0 0 1 0 6M21 20v-1.5a4 4 0 0 0-2.5-3.7'] },
  briefcase: { paths: ['M9 6V4h6v2M3 8h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8zm0 4h18M10 12v2h4v-2'] },
  shield: { paths: ['M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3zm-3 9 2 2 4-5'] },
  report: { paths: ['M4 20V4M4 20h17M8 17v-4M12 17V8M16 17v-7M20 17V5'] },
  settings: { paths: ['M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5zm0-12 1.1 2.3 2.5.5 1.7 2-1 2.4 1 2.4-1.7 2-2.5.5L12 20.5l-1.1-2.3-2.5-.5-1.7-2 1-2.4-1-2.4 1.7-2 2.5-.5L12 3.5z'] },
  menu: { paths: ['M4 6h16M4 12h16M4 18h16'] },
  search: { paths: ['m20 20-4.5-4.5M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13z'] },
  bell: { paths: ['M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4'] },
  'chevron-left': { paths: ['m15 18-6-6 6-6'] },
  'chevron-right': { paths: ['m9 18 6-6-6-6'] },
  'chevron-down': { paths: ['m6 9 6 6 6-6'] },
  plus: { paths: ['M12 5v14M5 12h14'] },
  filter: { paths: ['M3 5h18l-7 8v5l-4 2v-7L3 5z'] },
  close: { paths: ['M6 6l12 12M18 6 6 18'] },
  edit: { paths: ['m4 20 4.2-1 10-10a2.8 2.8 0 0 0-4-4l-10 10L4 20zm8.7-13.7 4 4'] },
  eye: { paths: ['M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'] },
  play: { paths: ['M8 5v14l11-7L8 5z'] },
  check: { paths: ['m5 12 4 4L19 6'] },
  rotate: { paths: ['M20 11a8 8 0 1 1-2.4-5.7M20 4v7h-7'] },
  logout: { paths: ['M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M14 8l4 4-4 4M18 12H8'] },
  clock: { paths: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-14v5l3 2'] },
  warning: { paths: ['M12 3 22 20H2L12 3zm0 6v4m0 3h.01'] },
  more: { paths: ['M5 12h.01M12 12h.01M19 12h.01'] },
  key: { paths: ['M15 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm-5 5h10M17 12v3M20 12v2'] },
};

@Component({
  selector: 'tp-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgFor],
  template: `<svg class="tp-icon" [attr.width]="20" [attr.height]="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" [attr.aria-label]="label || null" [attr.aria-hidden]="label ? null : 'true'" [attr.role]="label ? 'img' : null"><path *ngFor="let path of symbol.paths" [attr.d]="path"></path></svg>`,
})
export class IconComponent {
  @Input({ required: true }) name!: IconName;
  @Input() label = '';
  get symbol(): IconSymbol { return symbols[this.name]; }
}
