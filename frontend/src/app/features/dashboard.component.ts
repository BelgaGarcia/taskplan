import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TaskPlanApiService } from '../core/taskplan-api.service';
import type { DashboardSummary, Occurrence } from '../core/models';
import { IconComponent, type IconName } from '../shared/icon.component';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `<section class="page-content dashboard-page"><div class="page-heading"><div><p class="eyebrow">Operação</p><h2>Hoje</h2><p>Acompanhe as ocorrências e o que precisa de atenção da equipe.</p></div><a routerLink="/calendario" class="secondary-button"><tp-icon name="calendar"></tp-icon>Abrir calendário</a></div><p *ngIf="error" class="form-alert error">{{ error }}</p><ng-container *ngIf="summary; else loading"><div class="metric-grid"><article *ngFor="let item of totals" class="metric-card"><span class="metric-icon"><tp-icon [name]="item.icon"></tp-icon></span><div><strong>{{ item.value }}</strong><span>{{ item.label }}</span></div></article></div><div class="dashboard-grid"><article class="panel"><div class="panel-heading"><div><p class="eyebrow">Hoje</p><h3>Ocorrências do dia</h3></div><span class="count">{{ summary.today.occurrences.length }}</span></div><div class="occurrence-list" *ngIf="summary.today.occurrences.length; else noToday"><div class="occurrence-row" *ngFor="let occurrence of summary.today.occurrences"><span class="time">{{ occurrence.scheduledTime || '—' }}</span><div><b>{{ occurrence.task.name }}</b><small>{{ occurrence.task.function?.name || 'Sem função' }}</small></div><span class="status" [class]="'status ' + tone(occurrence.status)">{{ label(occurrence.status) }}</span></div></div><ng-template #noToday><p class="empty-state">Nenhuma ocorrência prevista para hoje.</p></ng-template></article><article class="panel"><div class="panel-heading"><div><p class="eyebrow">Agenda</p><h3>Próximas ocorrências</h3></div></div><div class="occurrence-list" *ngIf="summary.nextOccurrences.length; else noNext"><div class="occurrence-row" *ngFor="let occurrence of summary.nextOccurrences"><span class="date-chip">{{ occurrence.scheduledDate | date:'dd' }}<small>{{ occurrence.scheduledDate | date:'MMM' }}</small></span><div><b>{{ occurrence.task.name }}</b><small>{{ occurrence.scheduledTime || '—' }} · {{ occurrence.task.function?.name || 'Sem função' }}</small></div><span class="status" [class]="'status ' + tone(occurrence.status)">{{ label(occurrence.status) }}</span></div></div><ng-template #noNext><p class="empty-state">Nenhuma ocorrência futura encontrada.</p></ng-template></article></div></ng-container><ng-template #loading><div class="loading-block">Carregando indicadores…</div></ng-template></section>`,
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(TaskPlanApiService);
  summary?: DashboardSummary;
  error = '';
  ngOnInit(): void { this.api.dashboard().subscribe({ next: (summary) => this.summary = summary, error: () => this.error = 'Não foi possível carregar o dashboard.' }); }
  get totals(): Array<{ label: string; value: number; icon: IconName }> { const totals = this.summary?.totals; return [{ label: 'Pendentes', value: totals?.pending ?? 0, icon: 'clock' }, { label: 'Em andamento', value: totals?.inProgress ?? 0, icon: 'play' }, { label: 'Concluídas', value: totals?.completed ?? 0, icon: 'check' }, { label: 'Falhas', value: totals?.failed ?? 0, icon: 'warning' }, { label: 'Atrasadas', value: totals?.overdue ?? 0, icon: 'warning' }]; }
  label(status: string): string { return ({ PENDING: 'Pendente', IN_PROGRESS: 'Em andamento', COMPLETED: 'Concluída', FAILED: 'Falha', CANCELLED: 'Cancelada' } as Record<string, string>)[status] || status; }
  tone(status: string): string { return status === 'COMPLETED' ? 'success' : status === 'FAILED' || status === 'CANCELLED' ? 'danger' : status === 'IN_PROGRESS' ? 'warning' : 'info'; }
}