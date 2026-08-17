import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
@Component({ standalone: true, imports: [FormsModule, NgIf], template: `<section class="login-card"><h1>TaskPlan</h1><p>Planeje e acompanhe as tarefas da sua equipe.</p><form (ngSubmit)="submit()"><label>E-mail<input name="email" [(ngModel)]="email" type="email" autocomplete="username" required></label><label>Senha<input name="password" [(ngModel)]="password" type="password" autocomplete="current-password" required></label><p class="error" *ngIf="error">{{error}}</p><button [disabled]="busy">{{busy ? 'Entrando…' : 'Entrar'}}</button></form></section>` })
export class LoginComponent { private readonly auth = inject(AuthService); private readonly router = inject(Router); email = ''; password = ''; error = ''; busy = false;
  submit(): void { this.busy = true; this.error = ''; this.auth.login(this.email, this.password).subscribe({ next: () => void this.router.navigateByUrl('/dashboard'), error: () => { this.error = 'Não foi possível autenticar. Confira as credenciais.'; this.busy = false; }, complete: () => this.busy = false }); }
}
