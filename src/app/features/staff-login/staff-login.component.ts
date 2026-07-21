import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StaffAuthService } from '../../core/services/staff-auth.service';
import { RestaurantService } from '../../core/services/restaurant.service';

@Component({
  selector: 'app-staff-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './staff-login.component.html',
  styleUrl: './staff-login.component.css'
})
export class StaffLoginComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly staffAuth = inject(StaffAuthService);
  readonly restaurantSvc = inject(RestaurantService);

  readonly key       = signal('');
  readonly loading    = signal(false);
  readonly error      = signal('');
  readonly locked     = signal(false);

  // Page en plein écran (position: fixed) - on bloque le scroll du body le temps qu'elle
  // soit affichée, sinon son `padding-bottom` mobile (prévu pour la bottom-nav, absente
  // ici) laisse dépasser le fond de la page en dessous.
  ngOnInit() { document.body.style.overflow = 'hidden'; }
  ngOnDestroy() { document.body.style.overflow = ''; }

  submit() {
    const slug = this.route.parent?.snapshot.paramMap.get('restaurantSlug') ?? this.route.snapshot.paramMap.get('restaurantSlug');
    if (!slug || !this.key().trim() || this.locked()) return;

    this.loading.set(true);
    this.error.set('');

    this.staffAuth.loginWithKey(slug, this.key().trim()).subscribe({
      next: session => {
        this.router.navigate([this.staffAuth.redirectPathForRole(session.role, session.restaurant_slug)]);
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'Clé incorrecte.');
        this.loading.set(false);
        // Trop de tentatives : on éloigne rapidement du formulaire plutôt que de laisser
        // le champ ouvert à d'autres essais (le verrou reste de toute façon actif côté
        // serveur pendant 5 minutes, même après rechargement de la page).
        if (err?.error?.locked || err?.status === 429) {
          this.locked.set(true);
          setTimeout(() => this.router.navigate(['/', slug, 'menu']), 1800);
        }
      }
    });
  }
}
