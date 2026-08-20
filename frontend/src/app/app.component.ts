import { Component, HostListener, OnInit, inject } from '@angular/core';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { RuntimeConfigService } from './core/runtime-config.service';
import { IconComponent, type IconName } from './shared/icon.component';

interface NavigationItem { path: string; label: string; icon: IconName; }

@Component({
  selector: 'tp-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgFor, NgIf, AsyncPipe, IconComponent],
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
        <header *ngIf="auth.isAuthenticated" class="topbar"><button type="button" class="mobile-menu" (click)="drawerOpen = true" aria-label="Abrir menu"><tp-icon name="menu"></tp-icon></button><h1>Calendário</h1><div class="topbar-actions"><button type="button" class="icon-button" aria-label="Pesquisar"><tp-icon name="search"></tp-icon></button><button type="button" class="icon-button notification" aria-label="Notificações"><tp-icon name="bell"></tp-icon><i>3</i></button><span class="topbar-profile" *ngIf="auth.user$ | async as user"><span class="avatar">{{ user.name.slice(0, 1) }}</span><span><b>{{ user.name }}</b><small>{{ user.position?.name || user.role.name }}</small></span><tp-icon name="chevron-down"></tp-icon></span></div></header>
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
  ready = false;
  compact = false;
  drawerOpen = false;
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
    { path: '/perfis', label: 'Perfis', icon: 'shield' },
  ];
  readonly future: NavigationItem[] = [
    { path: '/relatorios', label: 'Relatórios', icon: 'report' },
    { path: '/configuracoes', label: 'Configurações', icon: 'settings' },
  ];

  ngOnInit(): void { this.config.load(); this.auth.initialize(); this.ready = true; }
  @HostListener('window:resize') onResize(): void { if (window.innerWidth > 820) this.drawerOpen = false; }
  toggleSidebar(): void { this.compact = !this.compact; }
  closeDrawer(): void { this.drawerOpen = false; }
  signOut(): void { this.auth.logout(); void this.router.navigateByUrl('/login'); }
}
