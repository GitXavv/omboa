import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SuperAdminAuthService } from '../../core/services/super-admin-auth.service';

@Component({
  selector: 'app-superadmin-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './superadmin-login.component.html',
  styleUrl: '../staff-login/staff-login.component.css'
})
export class SuperAdminLoginComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(SuperAdminAuthService);

  readonly key     = signal('');
  readonly loading = signal(false);
  readonly error   = signal('');

  submit() {
    if (!this.key().trim()) return;
    this.loading.set(true);
    this.error.set('');

    this.auth.loginWithKey(this.key().trim()).subscribe({
      next: () => this.router.navigate(['/osuper/dashboard']),
      error: () => {
        this.error.set('Clé incorrecte.');
        this.loading.set(false);
      }
    });
  }
}
