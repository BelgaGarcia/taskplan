import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IconComponent } from '../shared/icon.component';

@Component({
  standalone: true,
  imports: [IconComponent],
  template: `<section class="page-content future-page"><tp-icon name="clock"></tp-icon><p class="eyebrow">Funcionalidade futura</p><h2>{{ title }}</h2><p>Esta área está identificada no produto, mas ainda não possui dados simulados nem operações disponíveis.</p></section>`,
})
export class FutureFeatureComponent {
  private readonly route = inject(ActivatedRoute);
  readonly title = String(this.route.snapshot.data['title'] ?? 'Em breve');
}