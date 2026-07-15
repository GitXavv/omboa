import { Component, signal, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { LandingHeaderComponent } from './features/landing/landing-header.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { RestaurantService } from './core/services/restaurant.service';
import { RestaurantThemeService } from './core/services/restaurant-theme.service';

type HeaderMode = 'landing' | 'navbar' | 'none';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, LandingHeaderComponent, FooterComponent, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly headerMode = signal<HeaderMode>('landing');
  private readonly restaurantSvc = inject(RestaurantService);

  // Jamais utilisé directement ici — l'injection suffit à activer son effect() interne
  // (couleurs de marque appliquées/retirées selon RestaurantService.current()) pour
  // toute la durée de vie de l'app.
  private readonly theme = inject(RestaurantThemeService);

  constructor(private router: Router) {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(e => {
      const mode = this.computeHeaderMode(e.urlAfterRedirects);
      this.headerMode.set(mode);
      // En dehors d'un contexte /:restaurantSlug/*, on efface le restaurant précédent
      // pour ne pas laisser ses couleurs de marque "coller" à la landing / au super admin.
      if (this.isOutsideRestaurantContext(e.urlAfterRedirects)) this.restaurantSvc.clear();
    });
  }

  // Landing globale + pages "En savoir plus" (fidelite, liée depuis la landing — même
  // header/footer, aucun contexte restaurant) : header dédié (2095_level). Pages client
  // restaurant-scopées (menu/table/ma-commande/account) : navbar partagé. Tout le reste
  // (staff, /ostaff, /osuper) : ces pages gèrent leur propre en-tête.
  private static readonly STATIC_LANDING_PAGES = ['fidelite'];

  private computeHeaderMode(url: string): HeaderMode {
    const path = url.split('?')[0];
    if (path === '/' || path === '') return 'landing';

    const segments = path.split('/').filter(Boolean);
    const [slug, section] = segments;
    if (slug === 'osuper') return 'none';
    if (App.STATIC_LANDING_PAGES.includes(slug)) return 'landing';
    if (section && ['menu', 'table', 'ma-commande', 'account'].includes(section)) return 'navbar';
    return 'none';
  }

  private isOutsideRestaurantContext(url: string): boolean {
    const path = url.split('?')[0];
    const segments = path.split('/').filter(Boolean);
    return segments.length === 0 || segments[0] === 'osuper' || App.STATIC_LANDING_PAGES.includes(segments[0]);
  }
}
