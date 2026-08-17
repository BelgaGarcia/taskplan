import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { LoginComponent } from './features/login.component';
import { DashboardComponent } from './features/dashboard.component';
import { CalendarComponent } from './features/calendar.component';
import { ResourceListComponent } from './features/resource-list.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', canActivate: [authGuard], children: [
    { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    { path: 'dashboard', component: DashboardComponent },
    { path: 'calendario', component: CalendarComponent },
    { path: 'ocorrencias', component: ResourceListComponent, data: { title: 'Ocorrências', endpoint: 'task-occurrences', readOnly: true } },
    { path: 'tarefas', component: ResourceListComponent, data: { title: 'Tarefas', endpoint: 'tasks' } },
    { path: 'funcoes', component: ResourceListComponent, data: { title: 'Funções', endpoint: 'functions' } },
    { path: 'periodicidades', component: ResourceListComponent, data: { title: 'Periodicidades', endpoint: 'periodicities' } },
    { path: 'feriados', component: ResourceListComponent, data: { title: 'Feriados', endpoint: 'holidays' } },
    { path: 'usuarios', component: ResourceListComponent, data: { title: 'Usuários', endpoint: 'users' } },
    { path: 'cargos', component: ResourceListComponent, data: { title: 'Cargos', endpoint: 'positions' } },
    { path: 'perfis', component: ResourceListComponent, data: { title: 'Perfis', endpoint: 'roles' } },
    { path: 'relatorios', component: ResourceListComponent, data: { title: 'Relatórios', pending: true } },
    { path: 'configuracoes', component: ResourceListComponent, data: { title: 'Configurações', pending: true } }
  ] },
  { path: '**', redirectTo: '' }
];
