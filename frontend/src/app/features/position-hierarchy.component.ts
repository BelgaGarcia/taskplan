import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { TaskPlanApiService } from '../core/taskplan-api.service';
import type { PositionHierarchy } from '../core/models';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `<section class="page-content admin-page"><div class="page-heading"><div><p class="eyebrow">Administração · Cargos</p><h2>Hierarquia de cargos</h2><p>Marque os cargos cujas permissões cada cargo pode herdar.</p></div><button type="button" class="primary-button" [disabled]="saving || loading" (click)="save()">{{ saving ? 'Salvando…' : 'Salvar' }}</button></div><p *ngIf="error" class="form-alert error">{{ error }}</p><p *ngIf="notice" class="form-alert success">{{ notice }}</p><div *ngIf="loading" class="loading-block">Carregando hierarquia…</div><div *ngIf="hierarchy && !loading" class="table-wrap hierarchy-wrap"><table><thead><tr><th>Herda de →</th><th *ngFor="let target of hierarchy.positions">{{ target.name }}</th></tr></thead><tbody><tr *ngFor="let source of hierarchy.positions"><th>{{ source.name }}</th><td *ngFor="let target of hierarchy.positions"><input type="checkbox" [checked]="checked(source.id, target.id)" [disabled]="source.id === target.id" [attr.aria-label]="source.name + ' herda ' + target.name" (change)="toggle(source.id, target.id, $event)"></td></tr></tbody></table></div></section>`,
})
export class PositionHierarchyComponent implements OnInit {
  private readonly api = inject(TaskPlanApiService);
  hierarchy?: PositionHierarchy;
  loading = true;
  saving = false;
  error = '';
  notice = '';
  private selected = new Set<string>();

  ngOnInit(): void { this.load(); }
  checked(source: string, target: string): boolean { return this.selected.has(`${source}:${target}`); }
  toggle(source: string, target: string, event: Event): void { const key = `${source}:${target}`; (event.target as HTMLInputElement).checked ? this.selected.add(key) : this.selected.delete(key); this.notice = ''; }
  save(): void { const inheritances = Array.from(this.selected).map((key) => { const [positionId, inheritedPositionId] = key.split(':'); return { positionId, inheritedPositionId }; }); this.saving = true; this.error = ''; this.api.updatePositionHierarchy(inheritances).subscribe({ next: (hierarchy) => { this.hierarchy = hierarchy; this.saving = false; this.notice = 'Hierarquia salva com sucesso.'; }, error: (response: { error?: { message?: string | string[] } }) => { const message = response.error?.message; this.error = Array.isArray(message) ? message.join(' ') : message || 'Não foi possível salvar a hierarquia.'; this.saving = false; } }); }
  private load(): void { this.api.positionHierarchy().subscribe({ next: (hierarchy) => { this.hierarchy = hierarchy; this.selected = new Set(hierarchy.inheritances.map((edge) => `${edge.positionId}:${edge.inheritedPositionId}`)); this.loading = false; }, error: () => { this.error = 'Não foi possível carregar a hierarquia.'; this.loading = false; } }); }
}
