import { Component, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { LandingHeaderComponent } from './features/landing/landing-header.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { ToastComponent } from './shared/components/toast/toast.component';

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

  constructor(private router: Router) {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(e => this.headerMode.set(this.computeHeaderMode(e.urlAfterRedirects)));
  }

  // Landing globale : header dédié (2095_level). Pages client restaurant-scopées
  // (menu/table/ma-commande/account) : navbar partagé. Tout le reste (staff, /ostaff,
  // /osuper) : ces pages gèrent leur propre en-tête, pas de header commun ici.
  private computeHeaderMode(url: string): HeaderMode {
    const path = url.split('?')[0];
    if (path === '/' || path === '') return 'landing';

    const segments = path.split('/').filter(Boolean);
    const [slug, section] = segments;
    if (slug === 'osuper') return 'none';
    if (section && ['menu', 'table', 'ma-commande', 'account'].includes(section)) return 'navbar';
    return 'none';
  }
}
