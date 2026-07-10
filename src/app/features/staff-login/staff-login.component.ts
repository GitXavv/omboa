import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StaffAuthService } from '../../core/services/staff-auth.service';

@Component({
  selector: 'app-staff-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './staff-login.component.html',
  styleUrl: './staff-login.component.css'
})
export class StaffLoginComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly staffAuth = inject(StaffAuthService);

  readonly key       = signal('');
  readonly loading    = signal(false);
  readonly error      = signal('');

  submit() {
    const slug = this.route.parent?.snapshot.paramMap.get('restaurantSlug') ?? this.route.snapshot.paramMap.get('restaurantSlug');
    if (!slug || !this.key().trim()) return;

    this.loading.set(true);
    this.error.set('');

    this.staffAuth.loginWithKey(slug, this.key().trim()).subscribe({
      next: session => {
        this.router.navigate([this.staffAuth.redirectPathForRole(session.role, session.restaurant_slug)]);
      },
      error: () => {
        this.error.set('Clé incorrecte.');
        this.loading.set(false);
      }
    });
  }
}
