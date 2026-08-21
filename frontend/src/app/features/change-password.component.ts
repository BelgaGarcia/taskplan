import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  standalone: true,
  imports: [FormsModule, NgIf, IconComponent],
  template: `
    <section class="login-page password-change-page">
      <div class="login-intro"><a class="brand"><span class="brand-mark"><tp-icon name="app"></tp-icon></span>TaskPlan</a><p class="eyebrow">Segurança da conta</p><h1>Defina uma nova senha.</h1><p>Uma senha temporária foi usada para acessar sua conta. Para continuar, crie uma senha definitiva.</p></div>
      <div class="login-card"><p class="eyebrow">Troca obrigatória</p><h2>Atualize sua senha</h2><p class="muted">Use pelo menos 8 caracteres, uma letra maiúscula, uma minúscula e um número.</p><form (ngSubmit)="submit()"><label>Senha temporária<input name="currentPassword" [(ngModel)]="currentPassword" type="password" autocomplete="current-password" required></label><label>Nova senha<input name="newPassword" [(ngModel)]="newPassword" type="password" autocomplete="new-password" required></label><label>Confirme a nova senha<input name="confirmation" [(ngModel)]="confirmation" type="password" autocomplete="new-password" required></label><p class="form-alert error" *ngIf="error">{{ error }}</p><button class="primary-button" [disabled]="busy">{{ busy ? 'Salvando…' : 'Salvar nova senha' }}</button></form></div>
    </section>
  `,
})
export class ChangePasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  currentPassword = '';
  newPassword = '';
  confirmation = '';
  error = '';
  busy = false;

  submit(): void {
    this.error = '';
    if (this.newPassword !== this.confirmation) {
      this.error = 'A confirmação da nova senha não confere.';
      return;
    }

    this.busy = true;
    this.auth.changeOwnPassword(this.currentPassword, this.newPassword).subscribe({
      next: () => void this.router.navigateByUrl('/calendario'),
      error: (response: { error?: { message?: string | string[] } }) => {
        const message = response.error?.message;
        this.error = Array.isArray(message)
          ? message.join(' ')
          : message || 'Não foi possível alterar a senha.';
        this.busy = false;
      },
      complete: () => this.busy = false,
    });
  }
}
