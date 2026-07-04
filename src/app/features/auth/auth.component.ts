import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent {
  readonly loginPhone    = signal('');
  readonly loginPassword = signal('');
  readonly loginLoading  = signal(false);
  readonly loginError    = signal('');

  readonly fullName        = signal('');
  readonly regPhone        = signal('');
  readonly regPassword     = signal('');
  readonly registerLoading = signal(false);
  readonly registerError   = signal('');

  private readonly auth   = inject(AuthService);
  private readonly toast  = inject(ToastService);
  private readonly router = inject(Router);

  submitLogin() {
    if (!this.loginPhone() || !this.loginPassword()) {
      this.loginError.set('Veuillez remplir tous les champs.');
      return;
    }
    this.loginLoading.set(true);
    this.loginError.set('');

    this.auth.login(this.loginPhone(), this.loginPassword()).subscribe({
      next: () => {
        this.toast.success('Bienvenue !');
        const role = this.auth.currentUser()?.role;
        if (role === 'owner') this.router.navigate(['/admin']);
        else if (role === 'cook') this.router.navigate(['/kitchen']);
        else this.router.navigate(['/']);
      },
      error: () => {
        this.loginError.set('Numéro de téléphone ou mot de passe incorrect.');
        this.loginLoading.set(false);
      }
    });
  }

  submitRegister() {
    if (!this.fullName() || !this.regPhone() || !this.regPassword()) {
      this.registerError.set('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    this.registerLoading.set(true);
    this.registerError.set('');

    this.auth.register(this.regPhone(), this.regPassword(), this.fullName()).subscribe({
      next: () => {
        this.toast.success('Compte créé avec succès !');
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.registerError.set(err?.error?.message ?? 'Impossible de créer le compte. Réessayez.');
        this.registerLoading.set(false);
      }
    });
  }
}
