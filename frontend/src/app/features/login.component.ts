import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  standalone: true,
  imports: [FormsModule, NgIf, IconComponent],
  template: `<section class="login-page"><div class="login-intro"><a class="brand"><span class="brand-mark"><tp-icon name="app"></tp-icon></span>TaskPlan</a><p class="eyebrow">Organização que acontece</p><h1>Planeje com clareza.<br>Execute com confiança.</h1><p>Uma visão simples para acompanhar as tarefas e ocorrências da sua equipe.</p></div><div class="login-card"><p class="eyebrow">Acesse sua conta</p><h2>Boas-vindas</h2><p class="muted">Informe seus dados para continuar.</p><form (ngSubmit)="submit()"><label>E-mail<input name="email" [(ngModel)]="email" type="email" autocomplete="username" placeholder="voce@empresa.com" required></label><label>Senha<input name="password" [(ngModel)]="password" type="password" autocomplete="current-password" placeholder="Sua senha" required></label><p class="form-alert error" *ngIf="error">{{ error }}</p><button class="primary-button" [disabled]="busy">{{ busy ? 'Entrando…' : 'Entrar no TaskPlan' }}</button></form></div></section>`,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  email = '';
  password = '';
  error = '';
  busy = false;
  submit(): void {
    this.busy = true;
    this.error = '';
    this.auth.login(this.email, this.password).subscribe({
      next: (tokens) => void this.router.navigateByUrl(tokens.user?.mustChangePassword ? '/alterar-senha' : '/calendario'),
      error: () => { this.error = 'Não foi possível autenticar. Confira as credenciais.'; this.busy = false; },
      complete: () => this.busy = false,
    });
  }
}
