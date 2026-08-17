import { Component, OnInit, inject } from '@angular/core';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { RuntimeConfigService } from './core/runtime-config.service';

@Component({
  selector: 'tp-root', standalone: true, imports: [RouterOutlet, RouterLink, RouterLinkActive, NgFor, NgIf, AsyncPipe],
  template: `
    <div *ngIf="ready; else loading" class="app-shell" [class.login-layout]="!auth.isAuthenticated">
      <aside *ngIf="auth.isAuthenticated" class="sidebar">
        <a class="brand" routerLink="/dashboard"><span class="brand-mark">✓</span><span>TaskPlan</span></a>
        <p class="sidebar-label">Planejamento</p>
        <nav aria-label="Navegação principal"><a *ngFor="let item of menu" [routerLink]="item.path" routerLinkActive="active"><svg class="nav-icon"><use [attr.href]="'assets/icons.svg#' + item.icon"></use></svg>{{item.label}}</a></nav>
        <div class="sidebar-footer"><p class="sidebar-label">Conta</p><nav><a routerLink="/configuracoes" routerLinkActive="active"><svg class="nav-icon"><use href="assets/icons.svg#settings"></use></svg>Configurações</a></nav>
          <div class="profile" *ngIf="auth.user$ | async as user"><span class="avatar">{{user.name.slice(0, 1)}}</span><span><b>{{user.name}}</b><small>{{user.role.name || 'Usuário'}}</small></span></div>
          <button class="signout" type="button" (click)="signOut()"><span class="nav-icon">↪</span>Sair</button>
        </div>
      </aside>
      <main><header *ngIf="auth.isAuthenticated"><div><span class="eyebrow">Painel de operação</span><strong>Bem-vindo ao TaskPlan</strong></div><span class="header-user">{{ (auth.user$ | async)?.name || 'Sessão ativa' }}</span></header><router-outlet /></main>
    </div>
    <ng-template #loading><p class="center">Carregando TaskPlan…</p></ng-template>`,
})
export class AppComponent implements OnInit {
  readonly auth = inject(AuthService); private readonly config = inject(RuntimeConfigService); private readonly router = inject(Router); ready = false;
  readonly menu = [
    { path: '/dashboard', label: 'Dashboard', icon: 'home' }, { path: '/calendario', label: 'Calendário', icon: 'home' },
    { path: '/ocorrencias', label: 'Ocorrências', icon: 'home' }, { path: '/tarefas', label: 'Tarefas', icon: 'home' },
    { path: '/funcoes', label: 'Funções', icon: 'home' }, { path: '/periodicidades', label: 'Periodicidades', icon: 'home' },
    { path: '/feriados', label: 'Feriados', icon: 'home' }, { path: '/usuarios', label: 'Usuários', icon: 'home' },
    { path: '/cargos', label: 'Cargos', icon: 'home' }, { path: '/perfis', label: 'Perfis', icon: 'home' }, { path: '/relatorios', label: 'Relatórios', icon: 'home' },
  ];
  ngOnInit(): void { this.auth.initialize(); this.ready = true; }
  signOut(): void { this.auth.logout(); void this.router.navigateByUrl('/login'); }
}
