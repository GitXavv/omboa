import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: '../../auth/login/login.component.scss'
})
export class RegisterComponent {
  readonly fullName = signal('');
  readonly email    = signal('');
  readonly phone    = signal('');
  readonly password = signal('');
  readonly loading  = signal(false);
  readonly error    = signal('');

  private readonly auth   = inject(AuthService);
  private readonly toast  = inject(ToastService);
  private readonly router = inject(Router);

  submit() {
    if (!this.email() || !this.password() || !this.fullName()) {
      this.error.set('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    this.loading.set(true);
    this.error.set('');

    this.auth.register(this.email(), this.password(), this.fullName(), this.phone() || undefined).subscribe({
      next: () => {
        this.toast.success('Compte créé avec succès !');
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Impossible de créer le compte. Réessayez.');
        this.loading.set(false);
      }
    });
  }
}
