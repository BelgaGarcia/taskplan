import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { AuthService } from './core/auth.service';
import { RuntimeConfigService } from './core/runtime-config.service';
@Component({ selector: 'tp-root', imports: [RouterOutlet, RouterLink, NgFor, NgIf, AsyncPipe], template: `
  <div *ngIf="ready; else loading" class="app-shell" [class.login-layout]="!auth.isAuthenticated">
    <aside *ngIf="auth.isAuthenticated"><a class="brand" routerLink="/dashboard">TaskPlan</a><nav><a *ngFor="let item of menu" [routerLink]="item.path">{{item.label}}</a></nav></aside>
    <main><header *ngIf="auth.isAuthenticated"><span>{{ (auth.user$ | async)?.name || 'SessÃƒÂ£o ativa' }}</span><button type="button" (click)="signOut()">Sair</button></header><router-outlet /></main>
  </div><ng-template #loading><p class="center">Carregando TaskPlanÃ¢â‚¬Â¦</p></ng-template>`, styles: [] })
export class AppComponent implements OnInit { readonly auth = inject(AuthService); private readonly config = inject(RuntimeConfigService); private readonly router = inject(Router); ready = false;
  readonly menu = [{path:'/dashboard',label:'Dashboard'},{path:'/calendario',label:'CalendÃƒÂ¡rio'},{path:'/ocorrencias',label:'OcorrÃƒÂªncias'},{path:'/tarefas',label:'Tarefas'},{path:'/funcoes',label:'FunÃƒÂ§ÃƒÂµes'},{path:'/periodicidades',label:'Periodicidades'},{path:'/feriados',label:'Feriados'},{path:'/usuarios',label:'UsuÃƒÂ¡rios'},{path:'/cargos',label:'Cargos'},{path:'/perfis',label:'Perfis'}];
  ngOnInit(): void { this.auth.initialize(); this.ready = true; }
  signOut(): void { this.auth.logout(); void this.router.navigateByUrl('/login'); }
}
