import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http'; import { DatePipe, NgFor, NgIf } from '@angular/common';
import { RuntimeConfigService } from '../core/runtime-config.service';
@Component({ standalone: true, imports: [DatePipe, NgFor, NgIf], template: `<section><h1>Dashboard</h1><p *ngIf="error" class="error">{{error}}</p><div class="cards" *ngIf="summary"><article *ngFor="let total of totals"><strong>{{total.value}}</strong><span>{{total.label}}</span></article></div><h2>PrÃ³ximas ocorrÃªncias</h2><p *ngIf="!summary">Carregandoâ€¦</p><ul class="list" *ngIf="summary"><li *ngFor="let item of summary.nextOccurrences">{{item.scheduledDate | date:'dd/MM/yyyy'}} â€” {{item.task?.name || 'Tarefa'}} <small>{{item.status}}</small></li></ul></section>` })
export class DashboardComponent implements OnInit { private readonly http = inject(HttpClient); private readonly config = inject(RuntimeConfigService); summary: any; error = '';
 get totals() { const t = this.summary?.totals || {}; return [{label:'Pendentes',value:t.pending},{label:'Em andamento',value:t.inProgress},{label:'ConcluÃ­das',value:t.completed},{label:'Falhas',value:t.failed},{label:'Atrasadas',value:t.overdue}]; }
 ngOnInit(): void { this.http.get<any>(`${this.config.apiUrl}/dashboard/summary`).subscribe({next:s=>this.summary=s,error:()=>this.error='NÃ£o foi possÃ­vel carregar o dashboard.'}); }
}
