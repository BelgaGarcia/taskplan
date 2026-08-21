import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/auth.guard';
import { LoginComponent } from './features/login.component';
import { DashboardComponent } from './features/dashboard.component';
import { CalendarComponent } from './features/calendar.component';
import { AdminResourceComponent } from './features/admin-resource.component';
import { FutureFeatureComponent } from './features/future-feature.component';
import { PositionHierarchyComponent } from './features/position-hierarchy.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'calendario' },
      { path: 'calendario', component: CalendarComponent, data: { scope: 'team' } },
      { path: 'minhas-tarefas', component: CalendarComponent, data: { scope: 'mine', title: 'Minhas tarefas' } },
      { path: 'hoje', component: DashboardComponent },
      { path: 'tarefas', component: AdminResourceComponent, canActivate: [adminGuard], data: { resource: 'tasks' } },
      { path: 'funcoes', component: AdminResourceComponent, canActivate: [adminGuard], data: { resource: 'functions' } },
      { path: 'periodicidades', component: AdminResourceComponent, canActivate: [adminGuard], data: { resource: 'periodicities' } },
      { path: 'feriados', component: AdminResourceComponent, canActivate: [adminGuard], data: { resource: 'holidays' } },
      { path: 'usuarios', component: AdminResourceComponent, canActivate: [adminGuard], data: { resource: 'users' } },
      { path: 'cargos', component: AdminResourceComponent, canActivate: [adminGuard], data: { resource: 'positions' } },
      { path: 'cargos/hierarquia', component: PositionHierarchyComponent, canActivate: [adminGuard] },
      { path: 'perfis', component: AdminResourceComponent, canActivate: [adminGuard], data: { resource: 'roles' } },
      { path: 'relatorios', component: FutureFeatureComponent, data: { title: 'Relatórios' } },
      { path: 'configuracoes', component: FutureFeatureComponent, data: { title: 'Configurações' } },
    ],
  },
  { path: '**', redirectTo: '' },
];
