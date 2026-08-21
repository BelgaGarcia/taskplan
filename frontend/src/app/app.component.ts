import { Component, HostListener, OnInit, inject } from '@angular/core';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { RuntimeConfigService } from './core/runtime-config.service';
import { IconComponent, type IconName } from './shared/icon.component';
import { TaskPlanApiService } from './core/taskplan-api.service';
import type { DashboardSummary } from './core/models';

interface NavigationItem { path: string; label: string; icon: IconName; }
type TopbarPanel = 'search' | 'notifications' | 'profile' | null;

@Component({
  selector: 'tp-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgFor, NgIf, AsyncPipe, FormsModule, IconComponent],
  template: `
    <div *ngIf="ready; else loading" class="app-shell" [class.login-layout]="!auth.isAuthenticated" [class.sidebar-compact]="compact" [class.drawer-open]="drawerOpen">
      <aside *ngIf="auth.isAuthenticated" class="sidebar" aria-label="Navegação principal">
        <a class="brand" routerLink="/calendario" (click)="closeDrawer()"><tp-icon name="app"></tp-icon><span>TaskPlan</span></a>
        <button type="button" class="sidebar-toggle" (click)="toggleSidebar()" [attr.aria-label]="compact ? 'Expandir menu' : 'Recolher menu'" [title]="compact ? 'Expandir menu' : 'Recolher menu'"><tp-icon name="menu"></tp-icon><span>Recolher menu</span></button>
        <div class="sidebar-scroll">
          <p class="sidebar-label">Operação</p>
          <nav><a *ngFor="let item of operation" [routerLink]="item.path" routerLinkActive="active" (click)="closeDrawer()" [title]="compact ? item.label : ''"><tp-icon [name]="item.icon"></tp-icon><span>{{ item.label }}</span></a></nav>
          <ng-container *ngIf="auth.isAdmin">
            <p class="sidebar-label">Administração</p>
            <nav><a *ngFor="let item of administration" [routerLink]="item.path" routerLinkActive="active" (click)="closeDrawer()" [title]="compact ? item.label : ''"><tp-icon [name]="item.icon"></tp-icon><span>{{ item.label }}</span></a></nav>
          </ng-container>
          <p class="sidebar-label">Futuro</p>
          <nav><a *ngFor="let item of future" [routerLink]="item.path" routerLinkActive="active" (click)="closeDrawer()" [title]="compact ? item.label : ''"><tp-icon [name]="item.icon"></tp-icon><span>{{ item.label }}</span></a></nav>
        </div>
        <div class="profile" *ngIf="auth.user$ | async as user"><span class="avatar">{{ user.name.slice(0, 1) }}</span><span class="profile-text"><b>{{ user.name }}</b><small>{{ user.role.name }}</small></span></div>
        <button class="signout" type="button" (click)="signOut()" [title]="compact ? 'Sair' : ''"><tp-icon name="logout"></tp-icon><span>Sair</span></button>
      </aside>
      <div *ngIf="drawerOpen" class="drawer-scrim" (click)="closeDrawer()"></div>
      <main>
        <header *ngIf="auth.isAuthenticated" class="topbar"><button type="button" class="mobile-menu" (click)="drawerOpen = true" aria-label="Abrir menu"><tp-icon name="menu"></tp-icon></button><h1>Calendário</h1><div class="topbar-actions topbar-panel-area"><div class="topbar-popover-anchor"><button id="topbar-search" type="button" class="icon-button" aria-label="Pesquisar na navegação" aria-controls="topbar-search-panel" [attr.aria-expanded]="activeTopbarPanel === 'search'" (click)="toggleTopbarPanel('search', $event)"><tp-icon name="search"></tp-icon></button><section *ngIf="activeTopbarPanel === 'search'" id="topbar-search-panel" class="topbar-popover" role="dialog" aria-label="Pesquisa de navegação"><label class="sr-only" for="topbar-search-input">Pesquisar páginas</label><input id="topbar-search-input" [(ngModel)]="searchQuery" type="search" placeholder="Pesquisar páginas" autofocus><button type="button" *ngFor="let item of searchCommands" (click)="openCommand(item.path)"><tp-icon [name]="item.icon"></tp-icon>{{ item.label }}</button><p *ngIf="!searchCommands.length" class="empty-state">Nenhuma página disponível.</p></section></div><div class="topbar-popover-anchor"><button id="topbar-notifications" type="button" class="icon-button notification" aria-label="Notificações operacionais" aria-controls="topbar-notifications-panel" [attr.aria-expanded]="activeTopbarPanel === 'notifications'" (click)="toggleTopbarPanel('notifications', $event)"><tp-icon name="bell"></tp-icon><i *ngIf="notificationCount">{{ notificationCount }}</i></button><section *ngIf="activeTopbarPanel === 'notifications'" id="topbar-notifications-panel" class="topbar-popover" role="dialog" aria-label="Notificações operacionais"><p *ngIf="notificationLoading">Carregando alertas…</p><p class="form-alert error" *ngIf="notificationError">{{ notificationError }}</p><ng-container *ngIf="dashboardSummary && !notificationLoading"><button *ngIf="notificationCount" type="button" (click)="openCommand('/calendario')">{{ notificationCount }} ocorrência(s) atrasada(s)</button><p *ngIf="!notificationCount" class="empty-state">Não há alertas operacionais.</p></ng-container></section></div><div class="topbar-popover-anchor" *ngIf="auth.user$ | async as user"><button id="topbar-profile" type="button" class="topbar-profile" aria-label="Abrir menu do usuário" aria-controls="topbar-profile-panel" [attr.aria-expanded]="activeTopbarPanel === 'profile'" (click)="toggleTopbarPanel('profile', $event)"><span class="avatar">{{ user.name.slice(0, 1) }}</span><span><b>{{ user.name }}</b><small>{{ user.position?.name || user.role.name }}</small></span><tp-icon name="chevron-down"></tp-icon></button><section *ngIf="activeTopbarPanel === 'profile'" id="topbar-profile-panel" class="topbar-popover" role="menu" aria-label="Menu do usuário"><p><b>{{ user.name }}</b><small>{{ user.role.name }} · {{ user.position?.name || 'Sem cargo' }}</small></p><button type="button" role="menuitem" (click)="openCommand('/configuracoes')">Configurações</button><button type="button" role="menuitem" (click)="signOut()">Sair</button></section></div></div></header>
        <router-outlet />
      </main>
    </div>
    <ng-template #loading><p class="center">Carregando TaskPlan…</p></ng-template>
  `,
})
export class AppComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly config = inject(RuntimeConfigService);
  private readonly router = inject(Router);
  private readonly api = inject(TaskPlanApiService);
  ready = false;
  compact = false;
  drawerOpen = false;
  activeTopbarPanel: TopbarPanel = null;
  searchQuery = '';
  notificationLoading = false;
  notificationError = '';
  dashboardSummary?: DashboardSummary;
  private topbarTrigger?: HTMLElement;
  readonly operation: NavigationItem[] = [
    { path: '/calendario', label: 'Calendário', icon: 'calendar' },
    { path: '/hoje', label: 'Hoje', icon: 'today' },
    { path: '/minhas-tarefas', label: 'Minhas tarefas', icon: 'checklist' },
  ];
  readonly administration: NavigationItem[] = [
    { path: '/tarefas', label: 'Tarefas', icon: 'task' },
    { path: '/funcoes', label: 'Funções', icon: 'function' },
    { path: '/periodicidades', label: 'Periodicidades', icon: 'repeat' },
    { path: '/feriados', label: 'Feriados', icon: 'holiday' },
    { path: '/usuarios', label: 'Usuários', icon: 'users' },
    { path: '/cargos', label: 'Cargos', icon: 'briefcase' },
    { path: '/cargos/hierarquia', label: 'Hierarquia de cargos', icon: 'briefcase' },
    { path: '/perfis', label: 'Perfis', icon: 'shield' },
  ];
  readonly future: NavigationItem[] = [
    { path: '/relatorios', label: 'Relatórios', icon: 'report' },
    { path: '/configuracoes', label: 'Configurações', icon: 'settings' },
  ];

  ngOnInit(): void { this.config.load(); this.auth.initialize(); this.ready = true; }
  @HostListener('window:resize') onResize(): void { if (window.innerWidth > 820) this.drawerOpen = false; }
  @HostListener('document:keydown.escape') onEscape(): void { this.closeTopbarPanel(); }
  @HostListener('document:click', ['$event']) onDocumentClick(event: MouseEvent): void { if (!(event.target as HTMLElement).closest('.topbar-panel-area')) this.closeTopbarPanel(); }
  toggleSidebar(): void { this.compact = !this.compact; }
  closeDrawer(): void { this.drawerOpen = false; }
  signOut(): void { this.auth.logout(); void this.router.navigateByUrl('/login'); }
  toggleTopbarPanel(panel: Exclude<TopbarPanel, null>, event: MouseEvent): void { event.stopPropagation(); this.topbarTrigger = event.currentTarget as HTMLElement; this.activeTopbarPanel = this.activeTopbarPanel === panel ? null : panel; if (this.activeTopbarPanel === 'notifications') this.loadNotifications(); }
  closeTopbarPanel(restoreFocus = true): void { if (!this.activeTopbarPanel) return; this.activeTopbarPanel = null; if (restoreFocus) setTimeout(() => this.topbarTrigger?.focus()); }
  get searchCommands(): NavigationItem[] { const query = this.searchQuery.trim().toLocaleLowerCase('pt-BR'); const items = [...this.operation, ...(this.auth.isAdmin ? this.administration : [])]; return !query ? items : items.filter((item) => item.label.toLocaleLowerCase('pt-BR').includes(query)); }
  get notificationCount(): number { return this.dashboardSummary?.totals.overdue ?? 0; }
  openCommand(path: string): void { this.closeTopbarPanel(false); void this.router.navigateByUrl(path); }
  private loadNotifications(): void { if (this.notificationLoading || this.dashboardSummary) return; this.notificationLoading = true; this.notificationError = ''; this.api.dashboard().subscribe({ next: (summary) => { this.dashboardSummary = summary; this.notificationLoading = false; }, error: () => { this.notificationError = 'Não foi possível consultar os alertas operacionais.'; this.notificationLoading = false; } }); }
}
