import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  readonly email    = signal('');
  readonly password = signal('');
  readonly loading  = signal(false);
  readonly error    = signal('');

  private readonly auth   = inject(AuthService);
  private readonly toast  = inject(ToastService);
  private readonly router = inject(Router);

  submit() {
    if (!this.email() || !this.password()) { this.error.set('Veuillez remplir tous les champs.'); return; }
    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.email(), this.password()).subscribe({
      next: () => {
        this.toast.success('Bienvenue !');
        const role = this.auth.currentUser()?.role;
        if (role === 'owner') this.router.navigate(['/admin']);
        else if (role === 'cook') this.router.navigate(['/kitchen']);
        else this.router.navigate(['/']);
      },
      error: () => {
        this.error.set('Email ou mot de passe incorrect.');
        this.loading.set(false);
      }
    });
  }
}
